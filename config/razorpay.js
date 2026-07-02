// backend/config/razorpay.js
// PURPOSE: Initialize and export the Razorpay SDK instance
// This is used in the payment controller to create orders and verify signatures

const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = razorpayInstance;
