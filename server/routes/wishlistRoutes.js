/**
 * routes/wishlistRoutes.js
 * Mounted at: /api/wishlist
 * All routes require JWT authentication.
 */

const express = require("express");
const router = express.Router();

const {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  moveToCart,
} = require("../controllers/wishlistController");

const { protect } = require("../middleware/authMiddleware");

// All wishlist routes require authentication
router.use(protect);

router.get("/", getWishlist);
router.post("/add/:productId", addToWishlist);
router.delete("/remove/:productId", removeFromWishlist);
router.post("/move-to-cart/:productId", moveToCart);

module.exports = router;
