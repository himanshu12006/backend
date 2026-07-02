// routes/orderRoutes.js
// PURPOSE: Routes for order operations (placing orders, retrieving orders, updating statuses)

const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// All order endpoints require a logged-in user
router.use(protect);

// USER & ADMIN ROUTE: Get logged-in user's orders
router.get("/myorders", getMyOrders);

// USER ROUTE: Place a new order
router.post("/", placeOrder);

// ADMIN ONLY ROUTE: View all orders in the system
router.get("/", isAdmin, getAllOrders);

// ADMIN ONLY ROUTE: Update progress status of a specific order
router.put("/:id/status", isAdmin, updateOrderStatus);

module.exports = router;
