/**
 * models/Order.js
 * -----------------------------------------
 * Order schema with full lifecycle tracking:
 * - Status history with timestamps
 * - Snapshot of product details at purchase time
 * - Payment details, shipping address snapshot
 * - Coupon, shipping charge, totals
 * -----------------------------------------
 */

const mongoose = require("mongoose");

// ---- Order Item sub-schema ----
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Snapshot fields — saved so order history is preserved
    // even if the product is later deleted or updated
    productName: { type: String, required: true },
    productImage: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: null },
    totalPrice: { type: Number, required: true },
  },
  { _id: false }
);

// ---- Shipping Address sub-schema (snapshot, not a reference) ----
const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

// ---- Status History entry sub-schema ----
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    note: { type: String, default: "" }, // Optional admin note
  },
  { _id: false }
);

// ---- Main Order Schema ----
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    // ---- Payment ----
    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paymentDetails: {
      transactionId: { type: String, default: "" },
      gateway: { type: String, default: "" }, // e.g. "Razorpay"
      paidAt: { type: Date, default: null },
    },
    // ---- Order Status ----
    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Confirmed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Return Requested",
        "Returned",
      ],
      default: "Placed",
    },
    statusHistory: [statusHistorySchema],
    // ---- Financials ----
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    // ---- Coupon ----
    couponApplied: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null,
      },
      code: { type: String, default: "" },
      discountSaved: { type: Number, default: 0 },
    },
    // ---- Dates ----
    estimatedDelivery: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    // ---- Cancellation / Return ----
    cancelReason: { type: String, default: "" },
    returnReason: { type: String, default: "" },
    // ---- Customer notes ----
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

// =============================================
// PRE-SAVE HOOK — Auto-generate order number
// Format: ORD-YYYY-NNNN
// =============================================
orderSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const year = new Date().getFullYear();
    // Count total orders this year to get sequential number
    const count = await mongoose.model("Order").countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    });

    // Zero-pad to 4 digits: ORD-2024-0001
    this.orderNumber = `ORD-${year}-${String(count + 1).padStart(4, "0")}`;

    // Push the initial status into history
    this.statusHistory.push({
      status: this.orderStatus,
      changedAt: new Date(),
    });

    next();
  } catch (error) {
    next(error);
  }
});

// =============================================
// INDEXES
// Note: 'orderNumber' already has unique:true — no duplicate index needed.
// =============================================
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Order", orderSchema);
