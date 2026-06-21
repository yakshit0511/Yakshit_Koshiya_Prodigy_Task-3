/**
 * routes/categoryRoutes.js
 * Mounted at: /api/categories
 */

const express = require("express");
const router = express.Router();

const {
  getCategories,
  getAllCategoriesAdmin,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const { uploadCategoryImage } = require("../middleware/uploadMiddleware");

// Public
router.get("/", getCategories);
router.get("/admin/all", protect, isAdmin, getAllCategoriesAdmin);
router.get("/:slug", getCategoryBySlug);

// Admin
router.post("/", protect, isAdmin, uploadCategoryImage, createCategory);
router.put("/:id", protect, isAdmin, uploadCategoryImage, updateCategory);
router.delete("/:id", protect, isAdmin, deleteCategory);

module.exports = router;
