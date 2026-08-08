// backend/services/emailService.js
// PURPOSE: Centralized email notification service for OM CLOTH HOUSE
//
// Uses the official Resend Node.js SDK to send transactional HTML emails.
// Called by orderController.js after every successful order status update.
//
// NEVER hardcode API keys — always read from process.env

const { Resend } = require("resend");

// ─── Resend Client ────────────────────────────────────────────────────────────
let resend;
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey || apiKey === "re_your_api_key_here" || apiKey.trim() === "") {
  console.warn("⚠️  RESEND WARNING: RESEND_API_KEY is not configured or is using a placeholder. Order emails will not be sent.");
} else {
  try {
    resend = new Resend(apiKey);
  } catch (initErr) {
    console.error("❌ RESEND ERROR: Failed to instantiate Resend SDK:", initErr.message);
  }
}

// ─── Status → Visual Config Map ──────────────────────────────────────────────
// Each status has a unique color, emoji, badge text and human-friendly label.
const STATUS_CONFIG = {
  pending: {
    label: "Order Received",
    emoji: "🛍️",
    color: "#6B7280",       // Gray
    bgColor: "#F3F4F6",
    badgeColor: "#374151",
    subject: "We received your order!",
    headline: "Your order has been received.",
    message:
      "Thank you for shopping with OM CLOTH HOUSE! We've successfully received your order and it will be confirmed shortly.",
  },
  processing: {
    label: "Order Confirmed",
    emoji: "✅",
    color: "#2563EB",       // Blue
    bgColor: "#EFF6FF",
    badgeColor: "#1D4ED8",
    subject: "Your order is confirmed! ✅",
    headline: "Your order is confirmed.",
    message:
      "Great news! Your order has been confirmed and our team is preparing it for packing. We'll notify you as soon as it's packed.",
  },
  packed: {
    label: "Order Packed",
    emoji: "📦",
    color: "#D97706",       // Amber/Orange
    bgColor: "#FFFBEB",
    badgeColor: "#B45309",
    subject: "Your order has been packed! 📦",
    headline: "Your order has been packed.",
    message:
      "Your items have been carefully packed and are ready for dispatch. Our courier partner will pick up your package very soon.",
  },
  shipped: {
    label: "Order Shipped",
    emoji: "🚚",
    color: "#7C3AED",       // Purple
    bgColor: "#F5F3FF",
    badgeColor: "#6D28D9",
    subject: "Your order is on its way! 🚚",
    headline: "Your order has been shipped.",
    message:
      "Your order is now on its way to you! Our courier partner has picked up your package and it's heading to your destination.",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    emoji: "🏠",
    color: "#D97706",       // Yellow/Amber
    bgColor: "#FEFCE8",
    badgeColor: "#92400E",
    subject: "Your order is out for delivery! 🏠",
    headline: "Your order is out for delivery.",
    message:
      "Exciting! Your order is out for delivery and will reach you today. Please ensure someone is available to receive the package.",
  },
  delivered: {
    label: "Order Delivered",
    emoji: "🎉",
    color: "#059669",       // Green
    bgColor: "#ECFDF5",
    badgeColor: "#047857",
    subject: "Your order has been delivered! 🎉",
    headline: "Your order has been delivered!",
    message:
      "Your order has been successfully delivered. We hope you love your new clothes from OM CLOTH HOUSE! Don't forget to leave us a review.",
  },
  cancelled: {
    label: "Order Cancelled",
    emoji: "❌",
    color: "#DC2626",       // Red
    bgColor: "#FEF2F2",
    badgeColor: "#B91C1C",
    subject: "Your order has been cancelled",
    headline: "Your order has been cancelled.",
    message:
      "Your order has been cancelled. If you did not request this cancellation or have any questions, please contact our support team immediately.",
  },
};

// ─── Helper: Format Currency ──────────────────────────────────────────────────
const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// ─── Helper: Format Date ──────────────────────────────────────────────────────
const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ─── Helper: Generate Product Card HTML ──────────────────────────────────────
const generateProductCard = (item) => `
  <tr>
    <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; vertical-align: middle;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
        <tr>
          <td style="width: 72px; vertical-align: middle;">
            ${
              item.image
                ? `<img src="${item.image}" alt="${item.name}" width="64" height="72"
                    style="border-radius: 8px; object-fit: cover; border: 1px solid #E5E7EB; display: block;" />`
                : `<div style="width:64px;height:72px;background:#F3F4F6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">👗</div>`
            }
          </td>
          <td style="padding-left: 14px; vertical-align: middle;">
            <p style="margin:0; font-size:14px; font-weight:600; color:#111827; font-family: 'Georgia', serif;">${item.name}</p>
            <p style="margin:4px 0 0; font-size:12px; color:#6B7280;">Size: ${item.size || "N/A"} &nbsp;|&nbsp; Qty: ${item.quantity}</p>
          </td>
          <td style="text-align:right; vertical-align:middle; white-space:nowrap;">
            <p style="margin:0; font-size:14px; font-weight:700; color:#111827;">${formatCurrency(item.price * item.quantity)}</p>
            <p style="margin:4px 0 0; font-size:11px; color:#9CA3AF;">${formatCurrency(item.price)} each</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`;

// ─── Helper: Generate Timeline HTML ──────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: "pending",           label: "Order Received",   icon: "🛍️" },
  { key: "processing",        label: "Confirmed",         icon: "✅" },
  { key: "packed",            label: "Packed",            icon: "📦" },
  { key: "shipped",           label: "Shipped",           icon: "🚚" },
  { key: "out_for_delivery",  label: "Out for Delivery",  icon: "🏠" },
  { key: "delivered",         label: "Delivered",         icon: "🎉" },
];

const generateTimeline = (currentStatus) => {
  if (currentStatus === "cancelled") {
    return `<p style="text-align:center; color:#DC2626; font-size:13px; padding:8px 0;">❌ This order was cancelled.</p>`;
  }

  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.key === currentStatus);

  const steps = TIMELINE_STEPS.map((step, i) => {
    const isDone    = i <= currentIndex;
    const isCurrent = i === currentIndex;

    const circleBg    = isDone   ? "#253B32" : "#E5E7EB";
    const circleColor = isDone   ? "#FFFFFF" : "#9CA3AF";
    const labelColor  = isCurrent ? "#253B32" : isDone ? "#374151" : "#9CA3AF";
    const fontWeight  = isCurrent ? "700" : "400";

    return `
      <td style="text-align:center; padding: 0 4px; width:${100 / TIMELINE_STEPS.length}%;">
        <div style="width:32px;height:32px;border-radius:50%;background:${circleBg};color:${circleColor};
          font-size:14px;display:inline-flex;align-items:center;justify-content:center;margin:0 auto 6px;
          line-height:32px;text-align:center;">${step.icon}</div>
        <p style="margin:0;font-size:9px;color:${labelColor};font-weight:${fontWeight};line-height:1.3;">${step.label}</p>
      </td>
    `;
  }).join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>${steps}</tr>
    </table>
  `;
};

// ─── Main: Generate Full HTML Email Template ──────────────────────────────────
const generateEmailHTML = (order, customerName, status) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["pending"];
  const shortOrderId = order._id.toString().slice(-8).toUpperCase();

  const productRows = (order.orderItems || []).map(generateProductCard).join("");

  const shippingAddr = order.shippingAddress
    ? `${order.shippingAddress.fullName}<br/>
       ${order.shippingAddress.address},<br/>
       ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}<br/>
       📞 ${order.shippingAddress.phone}`
    : "N/A";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

  <!-- Outer Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;padding:32px 0;">
    <tr>
      <td align="center">

        <!-- Card Container -->
        <table role="presentation" cellpadding="0" cellspacing="0"
          style="width:100%;max-width:600px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- ══ HEADER GRADIENT ══ -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a2e26 0%, #253B32 50%, #2d4a3e 100%); padding: 36px 32px; text-align:center;">
              <h1 style="margin:0;color:#C5A880;font-family:'Georgia',serif;font-size:28px;letter-spacing:2px;font-weight:400;">
                OM CLOTH HOUSE
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:3px;text-transform:uppercase;">
                Premium Indian Clothing
              </p>
            </td>
          </tr>

          <!-- ══ STATUS BADGE ══ -->
          <tr>
            <td style="background:${config.bgColor}; padding: 28px 32px; text-align:center; border-bottom: 1px solid #E5E7EB;">
              <div style="display:inline-block; background:${config.badgeColor}; color:#FFFFFF;
                padding:10px 28px; border-radius:999px; font-size:15px; font-weight:700;
                letter-spacing:1px; margin-bottom:12px;">
                ${config.emoji} &nbsp; ${config.label}
              </div>
              <h2 style="margin:12px 0 8px; color:#111827; font-size:22px; font-family:'Georgia',serif; font-weight:700;">
                ${config.headline}
              </h2>
              <p style="margin:0; color:#4B5563; font-size:14px; line-height:1.6; max-width:400px; margin:0 auto;">
                ${config.message}
              </p>
            </td>
          </tr>

          <!-- ══ BODY CONTENT ══ -->
          <tr>
            <td style="padding: 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px; font-size:15px; color:#374151;">
                Dear <strong>${customerName}</strong>,
              </p>

              <!-- Order Meta Info Grid -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                style="width:100%; background:#F9FAFB; border-radius:10px; border:1px solid #E5E7EB; margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px; border-right:1px solid #E5E7EB; width:50%;">
                    <p style="margin:0;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Order Number</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#111827;font-family:monospace;">#${shortOrderId}</p>
                  </td>
                  <td style="padding:16px 20px; width:50%;">
                    <p style="margin:0;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Order Date</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${formatDate(order.createdAt)}</p>
                  </td>
                </tr>
                <tr style="border-top:1px solid #E5E7EB;">
                  <td style="padding:16px 20px; border-right:1px solid #E5E7EB; width:50%;">
                    <p style="margin:0;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Payment Method</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#111827;">${order.paymentMethod}</p>
                  </td>
                  <td style="padding:16px 20px; width:50%;">
                    <p style="margin:0;font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Payment Status</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;
                      color:${order.paymentStatus === "paid" ? "#059669" : "#D97706"};">
                      ${order.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ── Order Timeline ── -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 14px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">
                  Order Progress
                </h3>
                ${generateTimeline(status)}
              </div>

              <!-- ── Product Items ── -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 14px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">
                  Items Ordered
                </h3>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  ${productRows}
                </table>
              </div>

              <!-- ── Price Summary ── -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                style="width:100%;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #E5E7EB;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="font-size:13px;color:#6B7280;">Subtotal</td>
                        <td style="text-align:right;font-size:13px;color:#374151;">${formatCurrency(order.itemsPrice)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #E5E7EB;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="font-size:13px;color:#6B7280;">Shipping</td>
                        <td style="text-align:right;font-size:13px;color:${order.shippingPrice === 0 ? "#059669" : "#374151"};">
                          ${order.shippingPrice === 0 ? "FREE" : formatCurrency(order.shippingPrice)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #E5E7EB;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="font-size:13px;color:#6B7280;">GST (18%)</td>
                        <td style="text-align:right;font-size:13px;color:#374151;">${formatCurrency(order.taxPrice)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;background:linear-gradient(135deg,#253B32,#2d4a3e);border-radius:0 0 10px 10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                      <tr>
                        <td style="font-size:15px;font-weight:700;color:#FFFFFF;">Grand Total</td>
                        <td style="text-align:right;font-size:18px;font-weight:700;color:#C5A880;">${formatCurrency(order.totalPrice)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── Shipping Address ── -->
              <div style="background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB;padding:16px 20px;margin-bottom:28px;">
                <h3 style="margin:0 0 10px;font-size:13px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">
                  Shipping Address
                </h3>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${shippingAddr}</p>
              </div>

              <!-- ── CTA Button ── -->
              <div style="text-align:center; margin-bottom:8px;">
                <a href="${process.env.FRONTEND_URL || "https://omclothhouse.com"}/auth"
                  style="display:inline-block;background:linear-gradient(135deg,#253B32,#2d4a3e);
                  color:#C5A880;text-decoration:none;padding:14px 40px;border-radius:8px;
                  font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                  View Your Orders
                </a>
              </div>

            </td>
          </tr>

          <!-- ══ SUPPORT ROW ══ -->
          <tr>
            <td style="background:#F3F4F6;padding:20px 32px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:13px;color:#6B7280;">
                Need help? Contact us at
                <a href="mailto:support@omclothhouse.com" style="color:#253B32;font-weight:600;text-decoration:none;">
                  support@omclothhouse.com
                </a>
              </p>
            </td>
          </tr>

          <!-- ══ FOOTER ══ -->
          <tr>
            <td style="background:#1a2e26;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:16px;color:#C5A880;font-family:'Georgia',serif;letter-spacing:2px;">
                OM CLOTH HOUSE
              </p>
              <p style="margin:0 0 12px;font-size:11px;color:rgba(255,255,255,0.5);">
                Thank you for shopping with us!
              </p>
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">
                © ${new Date().getFullYear()} OM CLOTH HOUSE. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Card Container -->

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};

// ─── Main Export: sendOrderStatusEmail ───────────────────────────────────────
/**
 * Sends a transactional HTML email when an order status changes.
 *
 * @param {Object} order          - Full Mongoose order document (populated with user)
 * @param {string} customerEmail  - Customer's email address
 * @param {string} customerName   - Customer's display name
 * @param {string} status         - New order status (e.g. "shipped", "delivered")
 */
const sendOrderStatusEmail = async (order, customerEmail, customerName, status) => {
  if (!resend) {
    console.warn("⚠️  RESEND: Resend client is not initialized. Skipping email notification.");
    return;
  }

  const config = STATUS_CONFIG[status];
  if (!config) {
    console.warn(`⚠️  RESEND: Unknown status "${status}". Skipping email.`);
    return;
  }

  const subject     = `${config.subject} | OM CLOTH HOUSE`;
  const htmlContent = generateEmailHTML(order, customerName, status);
  const fromAddress = process.env.EMAIL_FROM || "OM CLOTH HOUSE <onboarding@resend.dev>";

  // try {
  //   const response = await resend.emails.send({
  //     from:    fromAddress,
  //     to:      [customerEmail],
  //     subject: subject,
  //     html:    htmlContent,
  //   });

  //   console.log(`✅ Email sent [${status}] → ${customerEmail} | ID: ${response?.data?.id || "N/A"}`);
  // } catch (err) {
  //   // CRITICAL: Never throw here — email failures must never crash the API
  //   console.error(`❌ Email send failed for order ${order._id}: ${err.message}`);
  // }
  try {
    const response = await resend.emails.send({
        from: fromAddress,
        to: [customerEmail],
        subject: subject,
        html: htmlContent,
    });

    console.log("🔍 COMPLETE RESEND RESPONSE:", response);

    if (response?.error) {
        console.error("❌ RESEND ERROR:", response.error);
        return;
    }

    console.log(
        `✅ Email accepted by Resend [${status}] → ${customerEmail} | ID: ${response?.data?.id || "N/A"}`
    );

  } catch (err) {
      console.error(
          `❌ Email send failed for order ${order._id}:`,
          err
      );
  }
};

module.exports = { sendOrderStatusEmail };
