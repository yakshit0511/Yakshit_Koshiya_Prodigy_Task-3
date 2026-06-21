/**
 * routes/reviewRoutes.js
 * Mounted at: /api/reviews
 */

const express = require("express");
const router = express.Router();

const {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  toggleLike,
  getMyReviews,
} = require("../controllers/reviewController");

const { protect } = require("../middleware/authMiddleware");
const { uploadReviewImages } = require("../middleware/uploadMiddleware");

// Public
router.get("/product/:productId", getProductReviews);

// Protected customer routes
router.get("/my-reviews", protect, getMyReviews);
router.post("/", protect, uploadReviewImages, createReview);
router.put("/:reviewId", protect, uploadReviewImages, updateReview);
router.delete("/:reviewId", protect, deleteReview);
router.post("/:reviewId/like", protect, toggleLike);

module.exports = router;
