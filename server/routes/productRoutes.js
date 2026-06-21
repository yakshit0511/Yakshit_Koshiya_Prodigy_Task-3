/**
 * routes/productRoutes.js
 * -----------------------------------------
 * Product routes — public browsing + admin CRUD.
 * IMPORTANT: Specific static routes (/featured, /low-stock,
 * /admin/all) MUST come BEFORE the dynamic /:slug route
 * to avoid Mongoose treating "featured" as a slug.
 * Mounted at: /api/products
 * -----------------------------------------
 */

const express = require("express");
const router = express.Router();

const {
  getProducts,
  getFeaturedProducts,
  getLowStockProducts,
  getAllProductsAdmin,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
} = require("../controllers/productController");

const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const { uploadProductImages } = require("../middleware/uploadMiddleware");

// ---- Public routes ----
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);

// ---- Admin-only routes (must come before /:slug) ----
router.get("/low-stock", protect, isAdmin, getLowStockProducts);
router.get("/admin/all", protect, isAdmin, getAllProductsAdmin);

// ---- Public: single product by slug ----
router.get("/:slug", optionalAuth, getProductBySlug);

// ---- Admin: Create product with image uploads ----
router.post("/", protect, isAdmin, uploadProductImages, createProduct);

// ---- Admin: Update product (can add/remove images) ----
router.put("/:id", protect, isAdmin, uploadProductImages, updateProduct);

// ---- Admin: Soft delete ----
router.delete("/:id", protect, isAdmin, deleteProduct);

// ---- Admin: Toggle featured ----
router.put("/:id/toggle-featured", protect, isAdmin, toggleFeatured);

module.exports = router;
