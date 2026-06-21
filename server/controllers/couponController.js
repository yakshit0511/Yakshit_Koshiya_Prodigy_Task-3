/**
 * controllers/couponController.js
 * -----------------------------------------
 * Admin: Full CRUD for coupons with soft-delete
 * Customer: Validate coupon before checkout
 * -----------------------------------------
 */

const Coupon = require("../models/Coupon");
const { asyncHandler } = require("../middleware/errorHandler");

// =============================================
// ---- ADMIN ROUTES ----
// =============================================

// @route   POST /api/coupons
// @access  Admin
const createCoupon = asyncHandler(async (req, res) => {
  const {
    code, description, discountType, discountValue,
    minOrderAmount, maxDiscountAmount, usageLimit,
    validFrom, validUntil, isActive,
  } = req.body;

  if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
    res.status(400);
    throw new Error("code, discountType, discountValue, validFrom and validUntil are required.");
  }

  if (!["percentage", "fixed"].includes(discountType)) {
    res.status(400);
    throw new Error("discountType must be 'percentage' or 'fixed'.");
  }

  if (Number(discountValue) <= 0) {
    res.status(400);
    throw new Error("discountValue must be a positive number.");
  }

  if (discountType === "percentage" && Number(discountValue) > 100) {
    res.status(400);
    throw new Error("Percentage discount cannot exceed 100.");
  }

  if (new Date(validUntil) <= new Date(validFrom)) {
    res.status(400);
    throw new Error("validUntil must be after validFrom.");
  }

  const coupon = await Coupon.create({
    code: code.trim().toUpperCase(),
    description: description || "",
    discountType,
    discountValue: Number(discountValue),
    minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({
    success: true,
    message: `Coupon "${coupon.code}" created successfully.`,
    coupon,
  });
});

// @route   GET /api/coupons
// @access  Admin
const getCoupons = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === "true";
  }

  const coupons = await Coupon.find(filter)
    .sort("-createdAt")
    .select("-usedBy"); // Don't return full user list in list view

  res.status(200).json({
    success: true,
    count: coupons.length,
    coupons,
  });
});

// @route   GET /api/coupons/:couponId
// @access  Admin
const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId)
    .populate("usedBy", "name email");

  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  res.status(200).json({ success: true, coupon });
});

// @route   PUT /api/coupons/:couponId
// @access  Admin
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  // Cannot update core discount fields if already used by customers
  if (coupon.usedCount > 0) {
    const protectedFields = ["discountType", "discountValue", "code"];
    const attemptedChanges = protectedFields.filter((f) => req.body[f] !== undefined);
    if (attemptedChanges.length > 0) {
      res.status(400);
      throw new Error(
        `Cannot change ${attemptedChanges.join(", ")} of a coupon that has already been used by ${coupon.usedCount} customer(s). You can update other fields like dates, limits, or description.`
      );
    }
  }

  // Allow updating safe fields
  const allowed = [
    "description", "minOrderAmount", "maxDiscountAmount",
    "usageLimit", "validFrom", "validUntil", "isActive",
  ];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) coupon[field] = req.body[field];
  });

  // Allow code/discount update if not yet used
  if (coupon.usedCount === 0) {
    if (req.body.code) coupon.code = req.body.code.trim().toUpperCase();
    if (req.body.discountType) coupon.discountType = req.body.discountType;
    if (req.body.discountValue) coupon.discountValue = Number(req.body.discountValue);
  }

  await coupon.save();
  res.status(200).json({ success: true, message: "Coupon updated.", coupon });
});

// @route   DELETE /api/coupons/:couponId
// @access  Admin
// Soft delete — set isActive to false instead of hard delete
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found.");
  }

  // Soft delete if used by customers, hard delete otherwise
  if (coupon.usedCount > 0) {
    coupon.isActive = false;
    await coupon.save();
    return res.status(200).json({
      success: true,
      message: `Coupon deactivated (soft-deleted) since it was used by ${coupon.usedCount} customer(s). Usage history is preserved.`,
    });
  }

  await coupon.deleteOne();
  res.status(200).json({
    success: true,
    message: "Coupon permanently deleted.",
  });
});

// =============================================
// ---- CUSTOMER ROUTE ----
// =============================================

// @route   GET /api/coupons/validate/:code
// @access  Private (Customer)
const validateCoupon = asyncHandler(async (req, res) => {
  const code = req.params.code?.trim().toUpperCase();
  if (!code) {
    res.status(400);
    throw new Error("Coupon code is required.");
  }

  const coupon = await Coupon.findOne({ code }).select("-usedBy");
  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code.");
  }

  const { orderAmount = 0 } = req.query;
  const { valid, message } = coupon.isValid(Number(orderAmount), req.user._id);

  if (!valid) {
    return res.status(400).json({
      success: false,
      message,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  }

  const discountPreview = orderAmount > 0 ? coupon.calculateDiscount(Number(orderAmount)) : null;

  res.status(200).json({
    success: true,
    message: "Coupon is valid!",
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      validUntil: coupon.validUntil,
    },
    discountPreview,
  });
});

module.exports = {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};
