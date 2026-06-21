/**
 * routes/couponRoutes.js
 * Mounted at: /api/coupons
 */

const express = require("express");
const router = express.Router();

const {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} = require("../controllers/couponController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

// Customer: validate coupon (MUST be before /:couponId to avoid conflict)
router.get("/validate/:code", protect, validateCoupon);

// Admin routes
router.get("/", protect, isAdmin, getCoupons);
router.get("/:couponId", protect, isAdmin, getCouponById);
router.post("/", protect, isAdmin, createCoupon);
router.put("/:couponId", protect, isAdmin, updateCoupon);
router.delete("/:couponId", protect, isAdmin, deleteCoupon);

module.exports = router;
