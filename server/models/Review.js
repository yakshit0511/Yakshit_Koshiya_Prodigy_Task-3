/**
 * models/Review.js
 * -----------------------------------------
 * Product review schema.
 * - One review per user per product (unique index)
 * - Post-save/delete hooks update Product ratings
 * - Supports likes, admin reply and approval workflow
 * -----------------------------------------
 */

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Review title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    // Images uploaded with the review (stored on Cloudinary)
    images: [
      {
        url: String,
        publicId: String,
      },
    ],
    // True if the user actually purchased this product
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    // Users who liked this review
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Admin must approve before review is publicly visible
    isApproved: {
      type: Boolean,
      default: false,
    },
    // Admin's public reply to the review
    adminReply: {
      type: String,
      default: "",
      maxlength: [1000, "Admin reply cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================================
// UNIQUE CONSTRAINT — One review per user per product
// =============================================
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// =============================================
// VIRTUAL — Likes count
// =============================================
reviewSchema.virtual("likesCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// =============================================
// POST HOOKS — Update Product ratings after changes
// =============================================

/** After a review is saved, recalculate product ratings */
reviewSchema.post("save", async function () {
  try {
    const Product = mongoose.model("Product");
    await Product.updateRatings(this.product);
  } catch (error) {
    console.error("Failed to update product ratings after review save:", error);
  }
});

/** After a review is deleted, recalculate product ratings */
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      const Product = mongoose.model("Product");
      await Product.updateRatings(doc.product);
    } catch (error) {
      console.error(
        "Failed to update product ratings after review delete:",
        error
      );
    }
  }
});

module.exports = mongoose.model("Review", reviewSchema);
