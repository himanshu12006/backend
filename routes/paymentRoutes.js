// backend/routes/paymentRoutes.js
// All routes are protected — user must be logged in

const express = require("express");
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPaymentAndPlaceOrder,
  handlePaymentFailure,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

// Step 1: Create Razorpay order → returns order_id for frontend checkout popup
router.post("/create-order", protect, createRazorpayOrder);

// Step 2: After payment popup closes → verify signature & save order in DB
router.post("/verify", protect, verifyPaymentAndPlaceOrder);

// Step 3: If payment fails → log it
router.post("/failure", protect, handlePaymentFailure);

module.exports = router;
