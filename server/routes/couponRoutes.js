/**
 * routes/couponRoutes.js
 * Mounted at: /api/coupons
 */

const express = require("express");
const router = express.Router();

const {
  getCoupons,
  getCouponById,
  validateCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
} = require("../controllers/couponController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

// Customer: validate coupon before checkout
router.post("/validate", protect, validateCoupon);

// Admin: manage coupons
router.get("/", protect, isAdmin, getCoupons);
router.get("/:id", protect, isAdmin, getCouponById);
router.post("/", protect, isAdmin, createCoupon);
router.put("/:id", protect, isAdmin, updateCoupon);
router.delete("/:id", protect, isAdmin, deleteCoupon);
router.put("/:id/toggle", protect, isAdmin, toggleCouponStatus);

module.exports = router;
