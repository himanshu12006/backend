// backend/controllers/paymentController.js
// PURPOSE: Handle Razorpay payment creation and secure server-side signature verification

const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const sendResponse = require("../utils/apiResponse");
const { createNotification } = require("./notificationController");

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a Razorpay order (Step 1 of payment flow)
// @route   POST /api/payment/create-order
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
// HOW IT WORKS:
// 1. Frontend sends cart total (in rupees)
// 2. We create a Razorpay order (in paise — 1 rupee = 100 paise)
// 3. Return the Razorpay order_id to frontend
// 4. Frontend opens the Razorpay checkout popup with this order_id
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = "INR" } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("Invalid payment amount");
  }

  // Amount must be in paise (multiply rupees × 100)
  const options = {
    amount: Math.round(amount * 100), // e.g. ₹500 → 50000 paise
    currency,
    receipt: `rcpt_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
    notes: {
      userId: req.user._id.toString(),
      userEmail: req.user.email,
    },
  };

  const razorpayOrder = await razorpay.orders.create(options);

  sendResponse(res, 200, "Razorpay order created", {
    id: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    // Also send key_id so frontend can initialize the checkout
    key_id: process.env.RAZORPAY_KEY_ID,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Verify Razorpay payment & save order to DB (Step 2 of payment flow)
// @route   POST /api/payment/verify
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
// HOW SIGNATURE VERIFICATION WORKS:
// Razorpay sends: razorpay_order_id + razorpay_payment_id
// We create an HMAC-SHA256 hash of "order_id|payment_id" using our KEY_SECRET
// If our hash matches razorpay_signature → payment is genuine ✅
// If it doesn't match → someone tampered the request ❌
const verifyPaymentAndPlaceOrder = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    shippingAddress,
  } = req.body;

  // ── Step 1: Verify the signature ──────────────────────────────────────────
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error("Payment verification failed. Invalid signature.");
  }

  // ── Step 2: Validate shipping address ────────────────────────────────────────────
  if (
    !shippingAddress ||
    !shippingAddress.fullName ||
    !shippingAddress.phone ||
    !shippingAddress.address ||
    !shippingAddress.city ||
    !shippingAddress.pincode
  ) {
    res.status(400);
    throw new Error("Complete shipping address is required");
  }

  // ── Step 2b: Validate phone number ────────────────────────────────────────
  const phoneVal = shippingAddress.phone ? shippingAddress.phone.trim().replace(/\s+/g, "") : "";
  const phoneRegex = /^[6789]\d{9}$/;
  if (!phoneRegex.test(phoneVal)) {
    res.status(400);
    throw new Error("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
  }
  shippingAddress.phone = phoneVal; // Store cleaned value

  // ── Step 3: Fetch user's cart ─────────────────────────────────────────────
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty. Cannot place an order.");
  }

  // ── Step 4: Build order items & check stock ───────────────────────────────
  const orderItems = [];
  const productsToUpdate = [];

  for (const item of cart.items) {
    const product = item.product;
    if (!product) {
      res.status(404);
      throw new Error("One or more products in your cart no longer exist.");
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} left.`
      );
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      image: product.images?.[0]?.url || "",
    });

    productsToUpdate.push({ productObj: product, quantity: item.quantity });
  }

  // ── Step 5: Calculate prices ──────────────────────────────────────────────
  const itemsPrice = cart.totalPrice;
  const shippingPrice = itemsPrice > 1000 ? 0 : 80;
  const taxPrice = Math.round(itemsPrice * 0.18);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // ── Step 6: Save the confirmed, paid order ────────────────────────────────
  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod: "Razorpay",
    paymentStatus: "paid",              // Verified — mark as paid
    paymentResult: {
      id: razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      status: "captured",
      update_time: new Date().toISOString(),
    },
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    paidAt: Date.now(),
  });

  // ── Step 7: Reduce stock ────────────────────────────────────────────────────
  const LOW_STOCK_THRESHOLD = 5;
  for (const item of productsToUpdate) {
    item.productObj.stock -= item.quantity;
    await item.productObj.save();

    // Emit low-stock notification if stock drops to threshold or below (non-blocking)
    if (item.productObj.stock <= LOW_STOCK_THRESHOLD) {
      createNotification({
        type: "low_stock",
        title: "⚠️ Low Stock Alert",
        message: `"${item.productObj.name}" has only ${item.productObj.stock} unit${item.productObj.stock !== 1 ? "s" : ""} remaining in stock.`,
        refId: item.productObj._id.toString(),
        refLabel: item.productObj.name,
      });
    }
  }

  // ── Step 8: Clear cart ────────────────────────────────────────────────────
  cart.items = [];
  await cart.save();

  // ── Step 9: Emit admin notification (non-blocking) ──────────────────────────────
  createNotification({
    type: "new_order",
    title: "🛒 New Order (Razorpay)",
    message: `${shippingAddress.fullName} completed a Razorpay payment of ₹${totalPrice.toLocaleString("en-IN")} — Order ${"#" + order._id.toString().slice(-8).toUpperCase()} confirmed.`,
    refId: order._id.toString(),
    refLabel: `#${order._id.toString().slice(-8).toUpperCase()}`,
  });

  sendResponse(res, 201, "Payment verified and order placed successfully", order);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Handle payment failure (log it, no order created)
// @route   POST /api/payment/failure
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const handlePaymentFailure = asyncHandler(async (req, res) => {
  const { razorpay_order_id, error } = req.body;
  console.error(`Payment failed for order ${razorpay_order_id}:`, error);
  sendResponse(res, 200, "Payment failure logged", { razorpay_order_id });
});

module.exports = {
  createRazorpayOrder,
  verifyPaymentAndPlaceOrder,
  handlePaymentFailure,
};
