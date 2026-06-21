/**
 * models/Cart.js
 * -----------------------------------------
 * Shopping cart for a user.
 * One cart per user (unique constraint).
 * Totals are auto-calculated on every save.
 * -----------------------------------------
 */

const mongoose = require("mongoose");

// ---- Cart item sub-schema ----
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    // Snapshot the price at the time of adding to cart
    // so price changes don't silently affect the cart
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      default: null,
    },
  },
  { _id: true }
);

// ---- Main Cart Schema ----
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One cart per user
    },
    items: [cartItemSchema],
    couponApplied: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    // ---- Calculated totals (set by pre-save hook) ----
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// =============================================
// PRE-SAVE HOOK — Recalculate totals
// =============================================
cartSchema.pre("save", function (next) {
  let subtotal = 0;

  for (const item of this.items) {
    // Use discountPrice if available, otherwise use price
    const effectivePrice =
      item.discountPrice && item.discountPrice < item.price
        ? item.discountPrice
        : item.price;
    subtotal += effectivePrice * item.quantity;
  }

  this.subtotal = Math.round(subtotal * 100) / 100;
  // discountAmount is set separately when a coupon is applied
  this.totalAmount =
    Math.round((this.subtotal - (this.discountAmount || 0)) * 100) / 100;

  next();
});

// =============================================
// INSTANCE METHOD — Get total item count
// =============================================
cartSchema.methods.getTotalItems = function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
};

module.exports = mongoose.model("Cart", cartSchema);
