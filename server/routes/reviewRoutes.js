/**
 * routes/reviewRoutes.js
 * Mounted at: /api/reviews
 */

const express = require("express");
const router = express.Router();

const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  approveReview,
  addAdminReply,
  getPendingReviews,
} = require("../controllers/reviewController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const { uploadReviewImages } = require("../middleware/uploadMiddleware");

// Public: get approved reviews for a product
router.get("/product/:productId", getProductReviews);

// Admin: pending reviews queue
router.get("/pending", protect, isAdmin, getPendingReviews);

// Admin: approve / reply
router.put("/:reviewId/approve", protect, isAdmin, approveReview);
router.put("/:reviewId/reply", protect, isAdmin, addAdminReply);

// Private: CRUD and likes
router.post("/:productId", protect, uploadReviewImages, createReview);
router.put("/:reviewId", protect, updateReview);
router.delete("/:reviewId", protect, deleteReview);
router.put("/:reviewId/like", protect, toggleLike);

module.exports = router;
