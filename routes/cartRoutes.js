// routes/cartRoutes.js
// PURPOSE: Define endpoints for shopping cart operations. All endpoints require authorization.

const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/authMiddleware");

// Apply protect middleware to ALL routes in this router
router.use(protect);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/", updateCartQuantity);
router.delete("/", removeFromCart); // Using request body with product and size

module.exports = router;
