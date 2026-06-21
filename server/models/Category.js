/**
 * models/Category.js
 * -----------------------------------------
 * Category schema supporting hierarchical
 * parent-child structure for subcategories.
 * Slug is auto-generated from name.
 * -----------------------------------------
 */

const mongoose = require("mongoose");
const slugify = require("slugify");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    // Self-referencing: parentCategory allows nested subcategories
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Controls the display order in the UI (lower = first)
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    // Virtual populate: attach subcategories to parent on query
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================================
// VIRTUAL — Populate child categories
// =============================================
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentCategory",
});

// =============================================
// PRE-SAVE HOOK — Auto-generate slug from name
// =============================================
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true, // Remove special characters
      trim: true,
    });
  }
  next();
});

// =============================================
// INDEX — Speed up parent category lookups
// Note: slug and name already have unique:true indexes — no duplicate needed.
// =============================================
categorySchema.index({ parentCategory: 1 });

module.exports = mongoose.model("Category", categorySchema);
