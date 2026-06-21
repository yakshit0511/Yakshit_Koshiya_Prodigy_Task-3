/**
 * models/Product.js
 * -----------------------------------------
 * Product schema with full e-commerce fields:
 * images (Cloudinary), pricing, stock, tags,
 * specifications, ratings and SEO slug.
 * -----------------------------------------
 */

const mongoose = require("mongoose");
const slugify = require("slugify");

// ---- Image sub-schema ----
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // Cloudinary public_id for deletion
  },
  { _id: false }
);

// ---- Specification sub-schema (key-value pairs) ----
const specSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// ---- Main Product Schema ----
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, "Brand name cannot exceed 100 characters"],
    },
    images: [imageSchema],
    // ---- Pricing ----
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      min: [0, "Discount price cannot be negative"],
      default: null,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // ---- Stock ----
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    isInStock: {
      type: Boolean,
      default: true,
    },
    // ---- Identification ----
    sku: {
      type: String,
      unique: true,
      uppercase: true,
    },
    unit: {
      type: String,
      enum: ["piece", "kg", "litre", "dozen", "pack", "box", "gram", "ml"],
      default: "piece",
    },
    // ---- Searchability ----
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    specifications: [specSchema],
    // ---- Ratings (updated via Review model hooks) ----
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    // ---- Admin flags ----
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================================
// VIRTUALS
// =============================================

/** Virtual: primary image URL (first image) */
productSchema.virtual("primaryImage").get(function () {
  return this.images && this.images.length > 0 ? this.images[0].url : null;
});

/** Virtual: effective price (discountPrice if set, otherwise price) */
productSchema.virtual("effectivePrice").get(function () {
  return this.discountPrice && this.discountPrice < this.price
    ? this.discountPrice
    : this.price;
});

// =============================================
// INDEXES — for fast search & filter queries
// =============================================
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ stock: 1 });
productSchema.index({ sku: 1 });

// =============================================
// PRE-SAVE HOOKS
// =============================================

productSchema.pre("save", function (next) {
  // ---- Auto-generate slug from name ----
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });
  }

  // ---- Auto-generate SKU if not provided ----
  if (!this.sku) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.sku = `SKU-${timestamp}-${random}`;
  }

  // ---- Calculate discount percent ----
  if (this.discountPrice && this.discountPrice < this.price) {
    this.discountPercent = Math.round(
      ((this.price - this.discountPrice) / this.price) * 100
    );
  } else {
    this.discountPercent = 0;
    this.discountPrice = null;
  }

  // ---- Update isInStock based on stock quantity ----
  this.isInStock = this.stock > 0;

  next();
});

// =============================================
// STATIC METHOD — Update product ratings
// Called from Review model after save/delete
// =============================================
productSchema.statics.updateRatings = async function (productId) {
  const Review = mongoose.model("Review");

  const stats = await Review.aggregate([
    { $match: { product: productId, isApproved: true } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await this.findByIdAndUpdate(productId, {
      ratings: Math.round(stats[0].avgRating * 10) / 10,
      numReviews: stats[0].count,
    });
  } else {
    await this.findByIdAndUpdate(productId, { ratings: 0, numReviews: 0 });
  }
};

module.exports = mongoose.model("Product", productSchema);
