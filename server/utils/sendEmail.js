/**
 * utils/sendEmail.js
 * -----------------------------------------
 * Email utility using Nodemailer.
 * Supports multiple HTML email templates:
 *  - Welcome / Registration
 *  - Password Reset
 *  - Order Confirmation
 *  - Order Status Update
 *  - Support Ticket Reply
 * -----------------------------------------
 */

const nodemailer = require("nodemailer");

// =============================================
// TRANSPORTER — Configured from environment variables
// =============================================

/**
 * createTransporter — Creates and verifies a nodemailer transport.
 * @returns {nodemailer.Transporter}
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT === "465", // true for SSL/465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// =============================================
// BASE EMAIL LAYOUT — Shared header/footer wrapper
// =============================================
const emailLayout = (content, title = "Local Store") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 30px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; }
    .header p { color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 14px; }
    .body { padding: 35px 40px; color: #374151; line-height: 1.7; }
    .body h2 { color: #1f2937; font-size: 22px; margin-top: 0; }
    .body p { margin: 10px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
    .info-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .order-table th { background: #f1f5f9; color: #374151; padding: 12px; text-align: left; font-size: 13px; text-transform: uppercase; }
    .order-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    .total-row td { font-weight: 700; color: #1f2937; border-top: 2px solid #2563eb; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #6b7280; text-decoration: none; }
    .divider { height: 1px; background: #e5e7eb; margin: 25px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🛍️ Local Store</h1>
      <p>Your neighbourhood online store</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Local Store. All rights reserved.</p>
      <p>If you have questions, <a href="mailto:${process.env.EMAIL_USER}">contact us</a>.</p>
    </div>
  </div>
</body>
</html>
`;

// =============================================
// EMAIL TEMPLATES
// =============================================

const templates = {
  /** Welcome email sent after successful registration */
  welcome: (user) => ({
    subject: "🎉 Welcome to Local Store!",
    html: emailLayout(`
      <h2>Welcome, ${user.name}! 🎉</h2>
      <p>Thank you for creating an account at <strong>Local Store</strong>. We're thrilled to have you with us!</p>
      <div class="info-box">
        <p><strong>Your Account Details:</strong></p>
        <p>📧 Email: ${user.email}</p>
        <p>🏷️ Account Type: ${user.role}</p>
      </div>
      <p>Start exploring thousands of products and enjoy a seamless shopping experience.</p>
      <a href="${process.env.CLIENT_URL}/products" class="btn">🛒 Start Shopping</a>
      <div class="divider"></div>
      <p style="color:#9ca3af;font-size:13px;">If you did not create this account, please ignore this email or contact our support.</p>
    `, "Welcome to Local Store"),
  }),

  /** Password reset link email */
  passwordReset: (user, resetUrl) => ({
    subject: "🔐 Reset Your Password — Local Store",
    html: emailLayout(`
      <h2>Reset Your Password 🔐</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to choose a new one:</p>
      <a href="${resetUrl}" class="btn">Reset My Password</a>
      <div class="info-box">
        <p>⏰ This link expires in <strong>15 minutes</strong>.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;">For security, never share this link with anyone. Our team will never ask for it.</p>
    `, "Reset Password"),
  }),

  /** Order confirmation sent when order is placed */
  orderConfirmation: (user, order) => ({
    subject: `✅ Order Confirmed — #${order.orderNumber}`,
    html: emailLayout(`
      <h2>Order Confirmed! ✅</h2>
      <p>Hi <strong>${user.name}</strong>, your order has been placed successfully.</p>
      <div class="info-box">
        <p>📦 Order Number: <strong>${order.orderNumber}</strong></p>
        <p>💳 Payment: ${order.paymentMethod === "COD" ? "Cash on Delivery" : "Online Payment"}</p>
        <p>📅 Estimated Delivery: ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toDateString() : "3–5 business days"}</p>
      </div>
      <table class="order-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item) => `
            <tr>
              <td>${item.productName}</td>
              <td>${item.quantity}</td>
              <td>₹${item.totalPrice.toFixed(2)}</td>
            </tr>
          `).join("")}
          <tr class="total-row">
            <td colspan="2">Total Amount</td>
            <td>₹${order.totalAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="btn">Track Your Order</a>
    `, "Order Confirmed"),
  }),

  /** Status update email when order status changes */
  orderStatusUpdate: (user, order) => ({
    subject: `📬 Order Update — #${order.orderNumber} is now "${order.orderStatus}"`,
    html: emailLayout(`
      <h2>Your Order Status Updated 📬</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Your order <strong>#${order.orderNumber}</strong> has been updated:</p>
      <div class="info-box" style="border-color:#7c3aed;">
        <p>🔄 New Status: <span class="badge badge-blue">${order.orderStatus}</span></p>
        ${order.orderStatus === "Shipped" ? `<p>🚚 Your order is on its way! Check with our team for tracking details.</p>` : ""}
        ${order.orderStatus === "Delivered" ? `<p>🎉 Your order has been delivered. We hope you love it!</p>` : ""}
        ${order.orderStatus === "Cancelled" ? `<p>Your order has been cancelled. Refund (if applicable) will be processed in 3–5 days.</p>` : ""}
      </div>
      <a href="${process.env.CLIENT_URL}/orders/${order._id}" class="btn">View Order Details</a>
    `, "Order Status Update"),
  }),

  /** Support ticket reply notification */
  supportReply: (user, ticket, replyMessage) => ({
    subject: `💬 New Reply on Ticket #${ticket.ticketNumber}`,
    html: emailLayout(`
      <h2>New Reply on Your Support Ticket 💬</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Our support team has replied to your ticket:</p>
      <div class="info-box">
        <p>🎫 Ticket: <strong>#${ticket.ticketNumber}</strong> — ${ticket.subject}</p>
        <p>📌 Status: <span class="badge badge-green">${ticket.status}</span></p>
      </div>
      <div style="background:#f8fafc;padding:15px 20px;border-radius:8px;margin:15px 0;font-style:italic;">
        "${replyMessage}"
      </div>
      <a href="${process.env.CLIENT_URL}/support/${ticket._id}" class="btn">View Full Conversation</a>
    `, "Support Reply"),
  }),
};

// =============================================
// MAIN SEND FUNCTION
// =============================================

/**
 * sendEmail — Send an email using a named template.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.template - Template key (welcome, passwordReset, etc.)
 * @param {object} options.data - Data to pass to the template (user, order, etc.)
 */
const sendEmail = async ({ to, template, data }) => {
  try {
    const transporter = createTransporter();

    // Get the template function and call it with data
    const templateFn = templates[template];
    if (!templateFn) {
      throw new Error(`Email template '${template}' not found.`);
    }

    // Templates accept spread data — pass all data properties
    const { subject, html } = templateFn(...Object.values(data));

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId} → ${to}`);
    return info;
  } catch (error) {
    // Log but don't crash the app if email fails
    console.error(`❌ Email send failed to ${to}:`, error.message);
    // Re-throw only in critical cases — callers decide whether to propagate
    throw error;
  }
};

module.exports = { sendEmail, templates };
