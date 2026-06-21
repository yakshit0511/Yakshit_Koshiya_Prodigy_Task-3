/**
 * models/Coupon.js
 * -----------------------------------------
 * Discount coupon schema supporting:
 * - Percentage or fixed amount discounts
 * - Usage limits (global and per-user)
 * - Date-based validity window
 * - Min order amount gating
 * -----------------------------------------
 */

const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9_-]+$/,
        "Coupon code can only contain letters, numbers, hyphens and underscores",
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [1, "Discount value must be at least 1"],
    },
    // Minimum cart value required to apply this coupon
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Cap the maximum discount for percentage coupons
    // e.g. 20% off but max ₹200 off
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    // Total number of times this coupon can be used (null = unlimited)
    usageLimit: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    // Track which users have used this coupon
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
    },
    validUntil: {
      type: Date,
      required: [true, "Valid until date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================
// INSTANCE METHODS
// =============================================

/**
 * isValid — Check if coupon is currently usable.
 * @param {number} orderAmount - Cart total before discount
 * @param {ObjectId} userId - The user trying to apply the coupon
 * @returns {{ valid: boolean, message: string }}
 */
couponSchema.methods.isValid = function (orderAmount, userId) {
  const now = new Date();

  if (!this.isActive) {
    return { valid: false, message: "This coupon is inactive." };
  }
  if (now < this.validFrom) {
    return { valid: false, message: "This coupon is not yet active." };
  }
  if (now > this.validUntil) {
    return { valid: false, message: "This coupon has expired." };
  }
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    return { valid: false, message: "This coupon has reached its usage limit." };
  }
  if (orderAmount < this.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${this.minOrderAmount} required.`,
    };
  }
  if (userId && this.usedBy.some((id) => id.toString() === userId.toString())) {
    return {
      valid: false,
      message: "You have already used this coupon.",
    };
  }

  return { valid: true, message: "Coupon is valid." };
};

/**
 * calculateDiscount — Compute the discount amount for a given order total.
 * @param {number} orderAmount - Order subtotal
 * @returns {number} Discount amount to apply
 */
couponSchema.methods.calculateDiscount = function (orderAmount) {
  let discount = 0;

  if (this.discountType === "percentage") {
    discount = (orderAmount * this.discountValue) / 100;
    // Apply max discount cap for percentage coupons
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    // Fixed discount — cannot exceed order amount
    discount = Math.min(this.discountValue, orderAmount);
  }

  return Math.round(discount * 100) / 100;
};

// =============================================
// INDEXES
// Note: 'code' already has unique:true — no duplicate index needed.
// =============================================
couponSchema.index({ validUntil: 1 });
couponSchema.index({ isActive: 1 });

module.exports = mongoose.model("Coupon", couponSchema);
