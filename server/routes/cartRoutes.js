/**
 * routes/cartRoutes.js
 * Mounted at: /api/cart
 * All routes require JWT authentication.
 */

const express = require("express");
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
} = require("../controllers/cartController");

const { protect } = require("../middleware/authMiddleware");

// All cart routes require authentication
router.use(protect);

router.get("/", getCart);
router.post("/add", addToCart);
router.put("/update/:productId", updateCartItem);
router.delete("/remove/:productId", removeFromCart);
router.delete("/clear", clearCart);
router.post("/apply-coupon", applyCoupon);
router.delete("/remove-coupon", removeCoupon);

module.exports = router;
