// routes/notificationRoutes.js
// PURPOSE: Admin-protected endpoints for the notification panel

const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

// All notification routes require admin access
router.use(protect, isAdmin);

// GET all notifications + unread count
router.get("/", getNotifications);

// PUT mark all as read — must come BEFORE /:id routes to avoid route conflict
router.put("/read-all", markAllAsRead);

// PUT mark single notification as read
router.put("/:id/read", markAsRead);

// DELETE single notification
router.delete("/:id", deleteNotification);

module.exports = router;
