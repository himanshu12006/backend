// models/Notification.js
// PURPOSE: Store admin notifications for events like new orders, cancellations, low stock

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["new_order", "cancelled_order", "low_stock", "new_user"],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Optional reference to the related document (order ID, product ID, etc.)
    refId: {
      type: String,
      default: "",
    },

    // Optional: short ID for display (e.g. order #ABCD1234)
    refLabel: {
      type: String,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
