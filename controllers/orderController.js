// controllers/orderController.js
// PURPOSE: Business logic to manage customer orders (create order, view user orders, view all orders for admin, update order status)

const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const sendResponse = require("../utils/apiResponse");
const { sendOrderStatusEmail } = require("../services/emailService");

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
const placeOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, paymentResult } = req.body;

  if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.pincode || !shippingAddress.phone || !shippingAddress.fullName) {
    res.status(400);
    throw new Error("Please fill in complete shipping address (fullName, phone, address, city, state, pincode)");
  }

  // 1. Fetch user's cart
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty. Cannot place an order.");
  }

  // 2. Map cart items to order items and verify/prepare stock reductions
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
      throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} items left.`);
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      image: product.images && product.images.length > 0 ? product.images[0].url : "",
    });

    productsToUpdate.push({
      productObj: product,
      quantity: item.quantity,
    });
  }

  // 3. Calculate Prices
  const itemsPrice = cart.totalPrice;
  // Shipping rule: Free shipping for orders above ₹1000, else ₹80 shipping fee
  const shippingPrice = itemsPrice > 1000 ? 0 : 80;
  // Tax rule: 18% GST (Goods and Services Tax)
  const taxPrice = Math.round(itemsPrice * 0.18);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  // 4. Create the Order
  let normalizedPaymentMethod = paymentMethod || "COD";
  if (
    normalizedPaymentMethod.toLowerCase() === "razorpay" ||
    normalizedPaymentMethod.toLowerCase() === "online"
  ) {
    normalizedPaymentMethod = "Razorpay";
  }

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod: normalizedPaymentMethod,
    paymentStatus: normalizedPaymentMethod === "Razorpay" ? "paid" : "pending",
    paymentResult,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  });

  // 5. Update Stock Quantities in DB
  for (const item of productsToUpdate) {
    item.productObj.stock -= item.quantity;
    await item.productObj.save();
  }

  // 6. Clear user's cart
  cart.items = [];
  await cart.save();

  sendResponse(res, 201, "Order placed successfully", order);
});

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  sendResponse(res, 200, "Your orders fetched successfully", orders);
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("user", "name email")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "All orders fetched successfully", orders);
});

// @desc    Update order status or shipping details (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus } = req.body;

  if (!orderStatus) {
    res.status(400);
    throw new Error("Order status is required");
  }

  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(orderStatus)) {
    res.status(400);
    throw new Error("Invalid order status value");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // If order was already delivered, prevent updating status
  if (order.orderStatus === "delivered") {
    res.status(400);
    throw new Error("Order has already been delivered");
  }

  order.orderStatus = orderStatus;

  // Set timestamps for special delivery/cancel states
  if (orderStatus === "delivered") {
    order.deliveredAt = Date.now();
    order.paymentStatus = "paid"; // Mark as paid upon delivery for COD
  } else if (orderStatus === "cancelled") {
    order.cancelledAt = Date.now();
    // Return stock back to product inventory when order is cancelled
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }
  }

  const updatedOrder = await order.save();

  // ── Send Email Notification (non-blocking) ──────────────────────────────────
  // Fires AFTER the order is saved. Email failure MUST NOT rollback order update.
  (async () => {
    try {
      // Fetch the customer's email and name
      const customer = await User.findById(updatedOrder.user).select("name email");
      if (customer && customer.email) {
        await sendOrderStatusEmail(
          updatedOrder,
          customer.email,
          customer.name || "Valued Customer",
          orderStatus
        );
      } else {
        console.warn(`⚠️  Email skipped: Customer not found for order ${updatedOrder._id}`);
      }
    } catch (emailErr) {
      // Email errors are logged but never re-thrown
      console.error(`❌ Background email error for order ${updatedOrder._id}:`, emailErr.message);
    }
  })();

  sendResponse(res, 200, `Order status updated to ${orderStatus}`, updatedOrder);
});

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
};
