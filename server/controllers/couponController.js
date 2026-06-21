/**
 * controllers/couponController.js
 * -----------------------------------------
 * Coupon CRUD for admin + validate coupon for customers.
 * -----------------------------------------
 */

const Coupon = require("../models/Coupon");
const { asyncHandler } = require("../middleware/errorHandler");

// =============================================
// @route   GET /api/coupons
// @access  Admin
// =============================================
const getCoupons = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  const coupons = await Coupon.find(filter).sort("-createdAt").select("-usedBy");

  res.status(200).json({
    success: true,
    count: coupons.length,
    coupons,
  });
});

// =============================================
// @route   GET /api/coupons/:id
// @access  Admin
// =============================================
const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate(
    "usedBy",
    "name email"
  );

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  res.status(200).json({ success: true, coupon });
});

// =============================================
// @route   POST /api/coupons/validate
// @access  Private (customer checks a coupon)
// =============================================
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code || !orderAmount) {
    res.status(400);
    throw new Error("Coupon code and order amount are required.");
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code.");
  }

  const { valid, message } = coupon.isValid(Number(orderAmount), req.user._id);
  if (!valid) {
    res.status(400);
    throw new Error(message);
  }

  const discount = coupon.calculateDiscount(Number(orderAmount));

  res.status(200).json({
    success: true,
    message: "Coupon is valid!",
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    discountAmount: discount,
    finalAmount: Number(orderAmount) - discount,
  });
});

// =============================================
// @route   POST /api/coupons
// @access  Admin
// =============================================
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscountAmount,
    usageLimit,
    validFrom,
    validUntil,
    isActive,
  } = req.body;

  if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
    res.status(400);
    throw new Error("Code, discountType, discountValue, validFrom and validUntil are required.");
  }

  if (new Date(validUntil) <= new Date(validFrom)) {
    res.status(400);
    throw new Error("validUntil must be after validFrom.");
  }

  if (discountType === "percentage" && discountValue > 100) {
    res.status(400);
    throw new Error("Percentage discount cannot exceed 100.");
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountValue: Number(discountValue),
    minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    success: true,
    message: "Coupon created successfully.",
    coupon,
  });
});

// =============================================
// @route   PUT /api/coupons/:id
// @access  Admin
// =============================================
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  res.status(200).json({
    success: true,
    message: "Coupon updated.",
    coupon,
  });
});

// =============================================
// @route   DELETE /api/coupons/:id
// @access  Admin
// =============================================
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  await coupon.deleteOne();

  res.status(200).json({ success: true, message: "Coupon deleted." });
});

// =============================================
// @route   PUT /api/coupons/:id/toggle
// @access  Admin
// =============================================
const toggleCouponStatus = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.isActive ? "activated" : "deactivated"}.`,
    isActive: coupon.isActive,
  });
});

module.exports = {
  getCoupons,
  getCouponById,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
};
