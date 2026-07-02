// models/Order.js
// PURPOSE: Store every order placed by users
//
// When user clicks "Place Order":
// 1. We copy all cart items into a new Order document
// 2. We clear the user's cart
// 3. We save shipping address and payment info
//
// An order has a status that admin can update:
// pending → processing → shipped → delivered → cancelled

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },      // snapshot of product name
  price: { type: Number, required: true },     // price at time of order
  quantity: { type: Number, required: true },
  size: { type: String, required: true },
  image: { type: String },                     // product image URL snapshot
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: "India" },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderItems: [orderItemSchema],

    shippingAddress: shippingAddressSchema,

    paymentMethod: {
      type: String,
      enum: ["COD", "Online", "Razorpay"],  // Cash on Delivery, Online, or Razorpay
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    // If payment done online, store transaction details
    paymentResult: {
      id: String,          // transaction ID
      status: String,
      updateTime: String,
      emailAddress: String,
    },

    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    taxPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    deliveredAt: Date,      // set when order is delivered
    cancelledAt: Date,      // set if order is cancelled
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
