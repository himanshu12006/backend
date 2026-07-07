// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
  googleLogin,
} = require("../controllers/authController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/google", googleLogin);

// User protected routes
router.get("/profile", protect, getUserProfile);

// Admin-only user management routes
router.get("/users", protect, isAdmin, getAllUsers);
router.put("/users/:id/role", protect, isAdmin, updateUserRole);
router.delete("/users/:id", protect, isAdmin, deleteUser);

module.exports = router;
