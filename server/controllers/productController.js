/**
 * controllers/productController.js
 * -----------------------------------------
 * Handles product CRUD, image management,
 * filtering/search/sorting via ApiFeatures,
 * stock management and featured products.
 * -----------------------------------------
 */

const Product = require("../models/Product");
const Category = require("../models/Category");
const { asyncHandler } = require("../middleware/errorHandler");
const { deleteFromCloudinary } = require("../config/cloudinary");
const ApiFeatures = require("../utils/apiFeatures");

// =============================================
// @route   GET /api/products
// @access  Public
// =============================================
const getProducts = asyncHandler(async (req, res) => {
  // ---- Resolve category slug to _id if provided ----
  let categoryFilter = {};
  if (req.query.category) {
    const category = await Category.findOne({ slug: req.query.category });
    if (category) {
      // Also include subcategories
      const subCategories = await Category.find({
        parentCategory: category._id,
      });
      const categoryIds = [
        category._id,
        ...subCategories.map((c) => c._id),
      ];
      categoryFilter = { category: { $in: categoryIds } };
    }
  }

  // ---- Build base query ----
  const baseQuery = Product.find({ ...categoryFilter, isActive: true }).populate(
    "category",
    "name slug"
  );

  // ---- Apply ApiFeatures ----
  const features = new ApiFeatures(baseQuery, req.query)
    .search(["name", "description", "tags", "brand"])
    .filter()
    .sort()
    .paginate(12)
    .selectFields();

  // ---- Count total matching docs (before pagination) ----
  const countQuery = Product.find({
    ...categoryFilter,
    isActive: true,
  });
  const countFeatures = new ApiFeatures(countQuery, req.query)
    .search(["name", "description", "tags", "brand"])
    .filter();
  const totalCount = await countFeatures.query.countDocuments();

  const products = await features.query;

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / (features.limit || 12)),
    currentPage: features.page || 1,
    count: products.length,
    products,
  });
});

// =============================================
// @route   GET /api/products/featured
// @access  Public
// =============================================
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 8;

  const products = await Product.find({ isFeatured: true, isActive: true })
    .populate("category", "name slug")
    .sort("-createdAt")
    .limit(limit)
    .select("-__v");

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

// =============================================
// @route   GET /api/products/low-stock
// @access  Admin
// =============================================
const getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    isActive: true,
  })
    .populate("category", "name")
    .sort("stock")
    .select("name sku stock lowStockThreshold images price");

  res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

// =============================================
// @route   GET /api/products/admin/all
// @access  Admin
// =============================================
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(
    Product.find().populate("category", "name slug").populate("createdBy", "name email"),
    { ...req.query, includeInactive: "true" }
  )
    .search(["name", "sku", "brand"])
    .filter()
    .sort()
    .paginate(20)
    .selectFields();

  const totalCount = await Product.countDocuments();
  const products = await features.query;

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / (features.limit || 20)),
    currentPage: features.page || 1,
    count: products.length,
    products,
  });
});

// =============================================
// @route   GET /api/products/:slug
// @access  Public
// =============================================
const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isActive: true,
  })
    .populate("category", "name slug parentCategory")
    .populate("createdBy", "name")
    .select("-__v");

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.status(200).json({ success: true, product });
});

// =============================================
// @route   POST /api/products
// @access  Admin
// =============================================
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    category,
    brand,
    price,
    discountPrice,
    stock,
    lowStockThreshold,
    unit,
    tags,
    specifications,
    isFeatured,
  } = req.body;

  // ---- Validate category exists ----
  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    res.status(400);
    throw new Error("Invalid category ID.");
  }

  // ---- Process uploaded images (from Cloudinary via multer) ----
  const images = req.files
    ? req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }))
    : [];

  // ---- Parse JSON fields if sent as strings ----
  const parsedTags =
    typeof tags === "string" ? JSON.parse(tags) : tags || [];
  const parsedSpecs =
    typeof specifications === "string"
      ? JSON.parse(specifications)
      : specifications || [];

  const product = await Product.create({
    name,
    description,
    shortDescription,
    category,
    brand,
    images,
    price: Number(price),
    discountPrice: discountPrice ? Number(discountPrice) : null,
    stock: Number(stock),
    lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
    unit: unit || "piece",
    tags: parsedTags,
    specifications: parsedSpecs,
    isFeatured: isFeatured === "true" || isFeatured === true,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    product,
  });
});

// =============================================
// @route   PUT /api/products/:id
// @access  Admin
// =============================================
const updateProduct = asyncHandler(async (req, res) => {
  let product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const {
    name,
    description,
    shortDescription,
    category,
    brand,
    price,
    discountPrice,
    stock,
    lowStockThreshold,
    unit,
    tags,
    specifications,
    isFeatured,
    isActive,
    removeImages, // Array of publicIds to remove
  } = req.body;

  // ---- Handle image removal ----
  if (removeImages) {
    const toRemove =
      typeof removeImages === "string" ? JSON.parse(removeImages) : removeImages;

    for (const publicId of toRemove) {
      await deleteFromCloudinary(publicId).catch((err) =>
        console.error("Failed to delete image:", publicId, err)
      );
    }
    product.images = product.images.filter(
      (img) => !toRemove.includes(img.publicId)
    );
  }

  // ---- Handle new image uploads ----
  if (req.files && req.files.length > 0) {
    const newImages = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));
    product.images = [...product.images, ...newImages];
  }

  // ---- Update scalar fields ----
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (shortDescription !== undefined) product.shortDescription = shortDescription;
  if (category !== undefined) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (price !== undefined) product.price = Number(price);
  if (discountPrice !== undefined)
    product.discountPrice = discountPrice ? Number(discountPrice) : null;
  if (stock !== undefined) product.stock = Number(stock);
  if (lowStockThreshold !== undefined)
    product.lowStockThreshold = Number(lowStockThreshold);
  if (unit !== undefined) product.unit = unit;
  if (tags !== undefined)
    product.tags = typeof tags === "string" ? JSON.parse(tags) : tags;
  if (specifications !== undefined)
    product.specifications =
      typeof specifications === "string"
        ? JSON.parse(specifications)
        : specifications;
  if (isFeatured !== undefined)
    product.isFeatured = isFeatured === "true" || isFeatured === true;
  if (isActive !== undefined)
    product.isActive = isActive === "true" || isActive === true;

  await product.save();

  res.status(200).json({
    success: true,
    message: "Product updated successfully.",
    product,
  });
});

// =============================================
// @route   DELETE /api/products/:id
// @access  Admin (soft delete)
// =============================================
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  // Soft delete — just mark as inactive, preserve all data
  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: "Product has been deactivated successfully.",
  });
});

// =============================================
// @route   PUT /api/products/:id/toggle-featured
// @access  Admin
// =============================================
const toggleFeatured = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  product.isFeatured = !product.isFeatured;
  await product.save();

  res.status(200).json({
    success: true,
    message: `Product ${product.isFeatured ? "marked as" : "removed from"} featured.`,
    isFeatured: product.isFeatured,
  });
});

module.exports = {
  getProducts,
  getFeaturedProducts,
  getLowStockProducts,
  getAllProductsAdmin,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
};
