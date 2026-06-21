/**
 * controllers/reviewController.js
 * -----------------------------------------
 * Product review operations:
 * - Create, update, delete own reviews
 * - Get reviews for a product
 * - Like/unlike a review
 * - Admin: approve reviews, add admin reply
 * - Verified purchase check
 * -----------------------------------------
 */

const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { asyncHandler } = require("../middleware/errorHandler");
const { deleteFromCloudinary } = require("../config/cloudinary");

// =============================================
// @route   GET /api/reviews/product/:productId
// @access  Public
// =============================================
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { product: productId, isApproved: true };

  // ---- Sort options ----
  const sortMap = {
    newest: "-createdAt",
    oldest: "createdAt",
    rating: "-rating",
    helpful: "-likes",
  };
  const sortField = sortMap[req.query.sort] || "-createdAt";

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate("user", "name profilePhoto")
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .select("-__v"),
    Review.countDocuments(filter),
  ]);

  // ---- Rating distribution (1-5 stars) ----
  const distribution = await Review.aggregate([
    { $match: { product: require("mongoose").Types.ObjectId(productId), isApproved: true } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    ratingDistribution: distribution,
    reviews,
  });
});

// =============================================
// @route   POST /api/reviews/:productId
// @access  Private
// =============================================
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment } = req.body;

  if (!rating || !comment) {
    res.status(400);
    throw new Error("Rating and comment are required.");
  }

  // ---- Check product exists ----
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found.");
  }

  // ---- Check if already reviewed ----
  const existing = await Review.findOne({
    product: productId,
    user: req.user._id,
  });
  if (existing) {
    res.status(409);
    throw new Error("You have already reviewed this product. You can edit your existing review.");
  }

  // ---- Check if verified purchase ----
  const purchaseOrder = await Order.findOne({
    user: req.user._id,
    "items.product": productId,
    orderStatus: "Delivered",
  });
  const isVerifiedPurchase = !!purchaseOrder;

  // ---- Handle review images ----
  const images = req.files
    ? req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }))
    : [];

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating: Number(rating),
    title,
    comment,
    images,
    isVerifiedPurchase,
    isApproved: false, // Requires admin approval
  });

  await review.populate("user", "name profilePhoto");

  res.status(201).json({
    success: true,
    message: "Review submitted successfully. It will be visible after admin approval.",
    review,
  });
});

// =============================================
// @route   PUT /api/reviews/:reviewId
// @access  Private (owner only)
// =============================================
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  if (review.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You can only edit your own reviews.");
  }

  const { rating, title, comment } = req.body;

  if (rating !== undefined) review.rating = Number(rating);
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;

  // Reset approval after edit
  review.isApproved = false;

  await review.save();

  res.status(200).json({
    success: true,
    message: "Review updated. It will be re-reviewed by admin.",
    review,
  });
});

// =============================================
// @route   DELETE /api/reviews/:reviewId
// @access  Private (owner or admin)
// =============================================
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  const isOwner = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("You can only delete your own reviews.");
  }

  // ---- Delete review images from Cloudinary ----
  for (const img of review.images) {
    await deleteFromCloudinary(img.publicId).catch((e) =>
      console.error("Review image delete failed:", e)
    );
  }

  await review.findOneAndDelete({ _id: review._id });

  res.status(200).json({
    success: true,
    message: "Review deleted successfully.",
  });
});

// =============================================
// @route   PUT /api/reviews/:reviewId/like
// @access  Private
// =============================================
const toggleLike = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  const userId = req.user._id.toString();
  const index = review.likes.findIndex((id) => id.toString() === userId);

  let message;
  if (index === -1) {
    review.likes.push(req.user._id);
    message = "Review liked.";
  } else {
    review.likes.splice(index, 1);
    message = "Like removed.";
  }

  await review.save();

  res.status(200).json({
    success: true,
    message,
    likesCount: review.likes.length,
  });
});

// =============================================
// @route   PUT /api/reviews/:reviewId/approve
// @access  Admin
// =============================================
const approveReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { isApproved: true },
    { new: true }
  ).populate("user", "name");

  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  res.status(200).json({
    success: true,
    message: "Review approved and is now publicly visible.",
    review,
  });
});

// =============================================
// @route   PUT /api/reviews/:reviewId/reply
// @access  Admin
// =============================================
const addAdminReply = asyncHandler(async (req, res) => {
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    res.status(400);
    throw new Error("Reply text is required.");
  }

  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { adminReply: reply },
    { new: true }
  ).populate("user", "name");

  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  res.status(200).json({
    success: true,
    message: "Admin reply added.",
    review,
  });
});

// =============================================
// @route   GET /api/reviews/pending
// @access  Admin
// =============================================
const getPendingReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ isApproved: false })
    .populate("user", "name email")
    .populate("product", "name slug")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: reviews.length,
    reviews,
  });
});

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  toggleLike,
  approveReview,
  addAdminReply,
  getPendingReviews,
};
