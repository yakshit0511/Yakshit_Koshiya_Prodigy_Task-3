/**
 * controllers/reviewController.js
 * -----------------------------------------
 * Product review system:
 * Customer: Submit, Edit, Delete, Like
 * Admin: Approve, Reject, Reply, List pending
 * Rating summary and star distribution included
 * -----------------------------------------
 */

const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { asyncHandler } = require("../middleware/errorHandler");
const { deleteFromCloudinary } = require("../config/cloudinary");

// =============================================
// @route   POST /api/reviews
// @access  Private (Customer)
// =============================================
const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment } = req.body;

  if (!productId || !rating || !comment) {
    res.status(400);
    throw new Error("productId, rating and comment are required.");
  }

  const ratingNum = parseInt(rating, 10);
  if (ratingNum < 1 || ratingNum > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5.");
  }

  // ---- Check product exists ----
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found.");
  }

  // ---- Prevent duplicate review ----
  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    res.status(409);
    throw new Error("You have already reviewed this product. Edit your existing review instead.");
  }

  // ---- Check verified purchase ----
  const purchaseOrder = await Order.findOne({
    user: req.user._id,
    "items.product": productId,
    orderStatus: "Delivered",
  });
  const isVerifiedPurchase = !!purchaseOrder;

  // ---- Handle uploaded images ----
  const images = req.files
    ? req.files.map((f) => ({ url: f.path, publicId: f.filename }))
    : [];

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating: ratingNum,
    title: title || "",
    comment,
    images,
    isVerifiedPurchase,
    isApproved: false,
  });

  await review.populate("user", "name profilePhoto");

  res.status(201).json({
    success: true,
    message: "Review submitted successfully! It will be visible after admin approval.",
    review,
  });
});

// =============================================
// @route   GET /api/reviews/product/:productId
// @access  Public
// =============================================
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(20, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;

  // ---- Sort mapping ----
  const sortMap = {
    newest: "-createdAt",
    oldest: "createdAt",
    highest: "-rating",
    lowest: "rating",
    helpful: "-likes",
  };
  const sortField = sortMap[req.query.sort] || "-createdAt";

  // ---- Rating filter ----
  const filter = { product: productId, isApproved: true };
  if (req.query.rating) {
    const r = parseInt(req.query.rating, 10);
    if (r >= 1 && r <= 5) filter.rating = r;
  }

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate("user", "name profilePhoto")
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .select("-__v"),
    Review.countDocuments(filter),
  ]);

  // ---- Rating distribution (star breakdown) ----
  const distribution = await Review.aggregate([
    {
      $match: {
        product: mongoose.Types.ObjectId.isValid(productId)
          ? new mongoose.Types.ObjectId(productId)
          : null,
        isApproved: true,
      },
    },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  // Build complete 1-5 distribution
  const starMap = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  distribution.forEach((d) => { starMap[d._id] = d.count; });

  const totalApproved = await Review.countDocuments({ product: productId, isApproved: true });
  const avgRating = totalApproved > 0
    ? await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]).then((r) => Math.round((r[0]?.avg || 0) * 10) / 10)
    : 0;

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    ratingSummary: {
      average: avgRating,
      totalReviews: totalApproved,
      distribution: starMap,
    },
    reviews,
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
  if (rating !== undefined) {
    const r = parseInt(rating, 10);
    if (r < 1 || r > 5) {
      res.status(400);
      throw new Error("Rating must be between 1 and 5.");
    }
    review.rating = r;
  }
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;

  // Handle new images
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
    review.images = [...review.images, ...newImages];
  }

  // Reset approval since content changed
  review.isApproved = false;
  await review.save();

  res.status(200).json({
    success: true,
    message: "Review updated. It will be re-reviewed by admin before becoming visible.",
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
    throw new Error("Access denied. You can only delete your own reviews.");
  }

  // Delete images from Cloudinary
  for (const img of review.images) {
    if (img.publicId) {
      await deleteFromCloudinary(img.publicId).catch((e) =>
        console.error("Image delete failed:", e)
      );
    }
  }

  const productId = review.product;
  await review.deleteOne();

  // Recalculate product rating
  await Product.updateRatings(productId);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully.",
  });
});

// =============================================
// @route   POST /api/reviews/:reviewId/like
// @access  Private
// =============================================
const toggleLike = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  const userId = req.user._id.toString();
  const idx = review.likes.findIndex((id) => id.toString() === userId);
  let message;

  if (idx === -1) {
    review.likes.push(req.user._id);
    message = "Review liked.";
  } else {
    review.likes.splice(idx, 1);
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
// ---- ADMIN ROUTES ----
// =============================================

// @route   GET /api/admin/reviews
// @access  Admin
const getAllReviewsAdmin = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.isApproved !== undefined) {
    filter.isApproved = req.query.isApproved === "true";
  }

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate("user", "name email profilePhoto")
      .populate("product", "name slug images")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    reviews,
  });
});

// @route   PUT /api/admin/reviews/:reviewId/approve
// @access  Admin
const approveOrRejectReview = asyncHandler(async (req, res) => {
  const { isApproved } = req.body;
  if (typeof isApproved !== "boolean" && isApproved !== "true" && isApproved !== "false") {
    res.status(400);
    throw new Error("isApproved must be a boolean.");
  }

  const approved = isApproved === true || isApproved === "true";
  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { isApproved: approved },
    { new: true }
  ).populate("user", "name").populate("product", "name");

  if (!review) {
    res.status(404);
    throw new Error("Review not found.");
  }

  // Recalculate rating if status changed
  await Product.updateRatings(review.product._id);

  res.status(200).json({
    success: true,
    message: `Review ${approved ? "approved" : "rejected"}.`,
    review,
  });
});

// @route   PUT /api/admin/reviews/:reviewId/reply
// @access  Admin
const addAdminReply = asyncHandler(async (req, res) => {
  const { adminReply } = req.body;
  if (!adminReply || !adminReply.trim()) {
    res.status(400);
    throw new Error("adminReply text is required.");
  }

  const review = await Review.findByIdAndUpdate(
    req.params.reviewId,
    { adminReply: adminReply.trim() },
    { new: true }
  ).populate("user", "name profilePhoto");

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

// @route   GET /api/reviews/my-reviews
// @access  Private (Customer)
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate("product", "name slug images")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: reviews.length,
    reviews,
  });
});

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  toggleLike,
  getAllReviewsAdmin,
  approveOrRejectReview,
  addAdminReply,
  getMyReviews,
};

