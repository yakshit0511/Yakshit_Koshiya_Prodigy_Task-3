/**
 * models/SupportTicket.js
 * -----------------------------------------
 * Customer support ticket schema.
 * Supports threaded messages between customer
 * and admin, file attachments, priority levels
 * and auto-generated ticket numbers.
 * -----------------------------------------
 */

const mongoose = require("mongoose");

// ---- Message sub-schema (threaded conversation) ----
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    // File attachments (images, docs) stored on Cloudinary
    attachments: [
      {
        url: { type: String },
        publicId: { type: String },
        filename: { type: String },
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ---- Main SupportTicket Schema ----
const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Order Issue",
        "Payment Issue",
        "Product Issue",
        "Delivery Issue",
        "Return Request",
        "General Inquiry",
      ],
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    messages: [messageSchema],
    // Optional link to a related order for quick context
    relatedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================
// PRE-SAVE HOOK — Auto-generate ticket number
// Format: TKT-0001, TKT-0002, etc.
// =============================================
supportTicketSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const count = await mongoose.model("SupportTicket").countDocuments();
    this.ticketNumber = `TKT-${String(count + 1).padStart(4, "0")}`;
    next();
  } catch (error) {
    next(error);
  }
});

// =============================================
// INDEXES
// Note: 'ticketNumber' already has unique:true — no duplicate index needed.
// =============================================
supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });

module.exports = mongoose.model("SupportTicket", supportTicketSchema);
