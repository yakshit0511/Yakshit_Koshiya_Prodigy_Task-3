/**
 * routes/authRoutes.js
 * -----------------------------------------
 * Authentication and user profile routes.
 * Mounted at: /api/auth
 * -----------------------------------------
 */

const express = require("express");
const router = express.Router();

const {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  toggleWishlist,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { uploadProfilePhoto } = require("../middleware/uploadMiddleware");

// ---- Public routes ----
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.post("/refresh-token", refreshToken);

// ---- Protected routes (require JWT) ----
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/update-profile", protect, uploadProfilePhoto, updateProfile);
router.put("/change-password", protect, changePassword);

// ---- Address management ----
router.post("/add-address", protect, addAddress);
router.put("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);

// ---- Wishlist ----
router.post("/wishlist/:productId", protect, toggleWishlist);

module.exports = router;
