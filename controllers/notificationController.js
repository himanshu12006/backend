// controllers/notificationController.js
// PURPOSE: CRUD for admin notifications panel

const asyncHandler = require("express-async-handler");
const Notification = require("../models/Notification");
const sendResponse = require("../utils/apiResponse");

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all notifications (newest first), with unread count
// @route   GET /api/notifications
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({})
    .sort({ createdAt: -1 })
    .limit(50); // Cap at 50 most recent

  const unreadCount = await Notification.countDocuments({ isRead: false });

  sendResponse(res, 200, "Notifications fetched successfully", {
    notifications,
    unreadCount,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  sendResponse(res, 200, "Notification marked as read", notification);
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  sendResponse(res, 200, "All notifications marked as read");
});

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a single notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin
// ─────────────────────────────────────────────────────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }
  sendResponse(res, 200, "Notification deleted");
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: createNotification (used internally by other controllers)
// Not an Express route — just a utility function to emit notifications
// ─────────────────────────────────────────────────────────────────────────────
const createNotification = async ({ type, title, message, refId = "", refLabel = "" }) => {
  try {
    await Notification.create({ type, title, message, refId, refLabel });
  } catch (err) {
    // Never throw — notification creation failure must not block the main operation
    console.error("⚠️  Notification creation error:", err.message);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
