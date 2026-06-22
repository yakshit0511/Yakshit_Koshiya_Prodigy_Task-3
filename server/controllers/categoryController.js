/**
 * controllers/categoryController.js
 * -----------------------------------------
 * Category CRUD operations with image upload,
 * nested subcategory support and product check
 * before deletion.
 * -----------------------------------------
 */

const Category = require("../models/Category");
const Product = require("../models/Product");
const { asyncHandler } = require("../middleware/errorHandler");
const { deleteFromCloudinary } = require("../config/cloudinary");
const { getCache, setCache, clearCachePattern } = require("../utils/cache");

// =============================================
// @route   GET /api/categories
// @access  Public
// =============================================
const getCategories = asyncHandler(async (req, res) => {
  const cacheKey = "categories:active";
  const cached = getCache(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  // Get top-level categories (no parent) and populate their subcategories
  const categories = await Category.find({
    parentCategory: null,
    isActive: true,
  })
    .populate({
      path: "subcategories",
      match: { isActive: true },
      select: "name slug image sortOrder",
    })
    .sort("sortOrder name")
    .select("-__v")
    .lean();

  const responseData = {
    success: true,
    count: categories.length,
    categories,
  };

  setCache(cacheKey, responseData, 300); // Cache for 5 minutes

  res.status(200).json(responseData);
});

// =============================================
// @route   GET /api/categories/all (admin)
// @access  Admin
// =============================================
const getAllCategoriesAdmin = asyncHandler(async (req, res) => {
  const categories = await Category.find()
    .populate("parentCategory", "name slug")
    .sort("sortOrder name")
    .select("-__v")
    .lean();

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});

// =============================================
// @route   GET /api/categories/:slug
// @access  Public
// =============================================
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    isActive: true,
  })
    .populate("parentCategory", "name slug")
    .populate({
      path: "subcategories",
      match: { isActive: true },
      select: "name slug image",
    })
    .select("-__v")
    .lean();

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  // ---- Count products in this category ----
  const productCount = await Product.countDocuments({
    category: category._id,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    category: {
      ...category,
      productCount,
    },
  });
});

// =============================================
// @route   POST /api/categories
// @access  Admin
// =============================================
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, parentCategory, sortOrder, isActive } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Category name is required.");
  }

  // ---- Check for duplicate name ----
  const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) {
    res.status(409);
    throw new Error(`Category '${name}' already exists.`);
  }

  // ---- Handle uploaded image ----
  let image = { url: "", publicId: "" };
  if (req.file) {
    image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  const category = await Category.create({
    name,
    description,
    image,
    parentCategory: parentCategory || null,
    sortOrder: sortOrder ? Number(sortOrder) : 0,
    isActive: isActive !== undefined ? isActive : true,
  });

  clearCachePattern("categories:");

  res.status(201).json({
    success: true,
    message: "Category created successfully.",
    category,
  });
});

// =============================================
// @route   PUT /api/categories/:id
// @access  Admin
// =============================================
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const { name, description, parentCategory, sortOrder, isActive } = req.body;

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (parentCategory !== undefined)
    category.parentCategory = parentCategory || null;
  if (sortOrder !== undefined) category.sortOrder = Number(sortOrder);
  if (isActive !== undefined) category.isActive = isActive;

  // ---- Handle new image upload ----
  if (req.file) {
    // Delete old image from Cloudinary
    if (category.image?.publicId) {
      await deleteFromCloudinary(category.image.publicId).catch((e) =>
        console.error("Old category image delete failed:", e)
      );
    }
    category.image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  await category.save();

  clearCachePattern("categories:");

  res.status(200).json({
    success: true,
    message: "Category updated successfully.",
    category,
  });
});

// =============================================
// @route   DELETE /api/categories/:id
// @access  Admin
// =============================================
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  // ---- Check if any active products use this category ----
  const productCount = await Product.countDocuments({
    category: category._id,
    isActive: true,
  });
  if (productCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete category. ${productCount} product(s) are assigned to it. Please reassign or deactivate them first.`
    );
  }

  // ---- Check for subcategories ----
  const subCount = await Category.countDocuments({
    parentCategory: category._id,
  });
  if (subCount > 0) {
    res.status(400);
    throw new Error(
      `Cannot delete category. It has ${subCount} subcategory(ies). Delete or reassign them first.`
    );
  }

  // ---- Delete image from Cloudinary ----
  if (category.image?.publicId) {
    await deleteFromCloudinary(category.image.publicId).catch((e) =>
      console.error("Category image delete failed:", e)
    );
  }

  await category.deleteOne();

  clearCachePattern("categories:");

  res.status(200).json({
    success: true,
    message: "Category deleted successfully.",
  });
});

module.exports = {
  getCategories,
  getAllCategoriesAdmin,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
