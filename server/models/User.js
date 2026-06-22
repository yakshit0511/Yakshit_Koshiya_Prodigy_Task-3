/**
 * models/User.js
 * -----------------------------------------
 * User schema for the e-commerce platform.
 * Handles both customers and admins.
 * Password hashing done via pre-save hook.
 * -----------------------------------------
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// ---- Address sub-schema ----
const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Pincode must be 6 digits"],
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true } // Keep _id so we can update individual addresses
);

// ---- Main User Schema ----
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Never return password in queries by default
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number"],
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    addresses: [addressSchema],
    profilePhoto: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    isVerified: { type: Boolean, default: false },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    // ---- Account Hardening Fields ----
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    passwordHistory: {
      type: [String],
      default: [],
    },
    lastLoginIP: {
      type: String,
      default: "",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    // Wishlist: array of product _id references
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Password reset fields (not exposed in API responses)
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Refresh token stored server-side for invalidation support
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// =============================================
// PRE-SAVE HOOK — Hash password before saving
// =============================================
userSchema.pre("save", async function (next) {
  // Only hash if password was modified (not on other updates)
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// =============================================
// INSTANCE METHODS
// =============================================

/**
 * comparePassword — Compares plain text password with hashed one.
 * @param {string} enteredPassword - Plain text password from login form
 * @returns {boolean}
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * getResetPasswordToken — Generates and stores a hashed reset token.
 * Returns the unhashed token to send via email.
 * @returns {string} Plain reset token
 */
userSchema.methods.getResetPasswordToken = function () {
  // Generate a random 32-byte token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash it before storing in DB (so raw token is never in DB)
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token valid for 15 minutes
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken; // Return unhashed version to send in email
};

module.exports = mongoose.model("User", userSchema);
