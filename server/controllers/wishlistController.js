/**
 * controllers/wishlistController.js
 * -----------------------------------------
 * User wishlist management:
 * - Add / Remove products
 * - Get wishlist with live stock/price
 * - Move product from wishlist to cart
 * -----------------------------------------
 */

const User = require("../models/User");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const { asyncHandler } = require("../middleware/errorHandler");

// =============================================
// @route   POST /api/wishlist/add/:productId
// @access  Private
// =============================================
const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // ---- Validate product ----
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found or is no longer available.");
  }

  const user = await User.findById(req.user._id);

  // ---- Prevent duplicates ----
  const alreadyIn = user.wishlist.some((id) => id.toString() === productId);
  if (alreadyIn) {
    return res.status(200).json({
      success: true,
      message: "Product is already in your wishlist.",
      wishlistCount: user.wishlist.length,
    });
  }

  user.wishlist.push(productId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `"${product.name}" added to wishlist.`,
    wishlistCount: user.wishlist.length,
  });
});

// =============================================
// @route   DELETE /api/wishlist/remove/:productId
// @access  Private
// =============================================
const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.user._id);
  const before = user.wishlist.length;
  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);

  if (user.wishlist.length === before) {
    res.status(404);
    throw new Error("Product not in wishlist.");
  }

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist.",
    wishlistCount: user.wishlist.length,
  });
});

// =============================================
// @route   GET /api/wishlist
// @access  Private
// =============================================
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "wishlist",
    select: "name slug images price discountPrice stock isInStock discountPercent ratings numReviews isActive",
  });

  // ---- Filter out deactivated products from response ----
  const activeItems = user.wishlist.filter((p) => p && p.isActive);

  res.status(200).json({
    success: true,
    count: activeItems.length,
    wishlist: activeItems,
  });
});

// =============================================
// @route   POST /api/wishlist/move-to-cart/:productId
// @access  Private
// =============================================
const moveToCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  // ---- Validate product & stock ----
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found.");
  }
  if (!product.isInStock || product.stock <= 0) {
    res.status(400);
    throw new Error(`"${product.name}" is currently out of stock and cannot be added to cart.`);
  }

  // ---- Check in wishlist ----
  const user = await User.findById(req.user._id);
  const inWishlist = user.wishlist.some((id) => id.toString() === productId);
  if (!inWishlist) {
    res.status(404);
    throw new Error("Product not found in wishlist.");
  }

  // ---- Add to cart ----
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  const existingIdx = cart.items.findIndex((item) => item.product.toString() === productId);
  if (existingIdx > -1) {
    const newQty = cart.items[existingIdx].quantity + 1;
    if (newQty > product.stock) {
      res.status(400);
      throw new Error(`Cannot add more. Only ${product.stock} unit(s) available.`);
    }
    cart.items[existingIdx].quantity = newQty;
  } else {
    cart.items.push({
      product: productId,
      quantity: 1,
      price: product.price,
      discountPrice: product.discountPrice || null,
    });
  }
  await cart.save();

  // ---- Remove from wishlist ----
  user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
  await user.save({ validateBeforeSave: false });

  await cart.populate({
    path: "items.product",
    select: "name slug images price discountPrice stock isInStock",
  });

  res.status(200).json({
    success: true,
    message: `"${product.name}" moved to cart.`,
    cart,
    wishlistCount: user.wishlist.length,
  });
});

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  moveToCart,
};
