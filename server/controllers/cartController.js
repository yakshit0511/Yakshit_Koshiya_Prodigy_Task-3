/**
 * controllers/cartController.js
 * -----------------------------------------
 * Shopping cart operations:
 * - Get cart, add item, update quantity,
 *   remove item, clear cart, apply/remove coupon
 * -----------------------------------------
 */

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { asyncHandler } = require("../middleware/errorHandler");

// =============================================
// @route   GET /api/cart
// @access  Private
// =============================================
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "name slug images price discountPrice isInStock stock unit"
  ).populate("couponApplied", "code discountType discountValue");

  if (!cart) {
    return res.status(200).json({
      success: true,
      cart: {
        items: [],
        subtotal: 0,
        discountAmount: 0,
        totalAmount: 0,
        couponApplied: null,
      },
    });
  }

  // ---- Sync prices with current product prices ----
  // (inform user if prices changed since adding to cart)
  const priceChanges = [];
  for (const item of cart.items) {
    if (item.product) {
      const currentPrice = item.product.discountPrice || item.product.price;
      const savedPrice = item.discountPrice || item.price;
      if (Math.abs(currentPrice - savedPrice) > 0.01) {
        priceChanges.push({
          productName: item.product.name,
          oldPrice: savedPrice,
          newPrice: currentPrice,
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    cart,
    priceChanges: priceChanges.length > 0 ? priceChanges : undefined,
  });
});

// =============================================
// @route   POST /api/cart/add
// @access  Private
// =============================================
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error("Product ID is required.");
  }

  const qty = Math.max(1, parseInt(quantity, 10));

  // ---- Validate product ----
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found or unavailable.");
  }
  if (!product.isInStock || product.stock < qty) {
    res.status(400);
    throw new Error(
      `Insufficient stock. Only ${product.stock} unit(s) available.`
    );
  }

  // ---- Find or create cart ----
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // ---- Check if product already in cart ----
  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    // Update quantity, but cap at available stock
    const newQty = existingItem.quantity + qty;
    if (newQty > product.stock) {
      res.status(400);
      throw new Error(
        `Cannot add more. Only ${product.stock} unit(s) in stock.`
      );
    }
    existingItem.quantity = newQty;
    // Refresh price snapshot
    existingItem.price = product.price;
    existingItem.discountPrice = product.discountPrice;
  } else {
    // Add new item with price snapshot
    cart.items.push({
      product: productId,
      quantity: qty,
      price: product.price,
      discountPrice: product.discountPrice,
    });
  }

  await cart.save();

  // Re-fetch with populated data
  const populatedCart = await Cart.findById(cart._id).populate(
    "items.product",
    "name slug images price discountPrice isInStock unit"
  );

  res.status(200).json({
    success: true,
    message: "Product added to cart.",
    cart: populatedCart,
  });
});

// =============================================
// @route   PUT /api/cart/update
// @access  Private
// =============================================
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    res.status(400);
    throw new Error("Product ID and quantity are required.");
  }

  const qty = parseInt(quantity, 10);
  if (qty < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1. Use remove to delete the item.");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  const item = cart.items.find(
    (i) => i.product.toString() === productId
  );
  if (!item) {
    res.status(404);
    throw new Error("Item not in cart.");
  }

  // ---- Check stock ----
  const product = await Product.findById(productId);
  if (!product || product.stock < qty) {
    res.status(400);
    throw new Error(
      `Only ${product ? product.stock : 0} unit(s) available.`
    );
  }

  item.quantity = qty;
  await cart.save();

  const populatedCart = await Cart.findById(cart._id).populate(
    "items.product",
    "name slug images price discountPrice isInStock unit"
  );

  res.status(200).json({
    success: true,
    message: "Cart updated.",
    cart: populatedCart,
  });
});

// =============================================
// @route   DELETE /api/cart/remove/:productId
// @access  Private
// =============================================
const removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== req.params.productId
  );
  await cart.save();

  const populatedCart = await Cart.findById(cart._id).populate(
    "items.product",
    "name slug images price discountPrice isInStock unit"
  );

  res.status(200).json({
    success: true,
    message: "Item removed from cart.",
    cart: populatedCart,
  });
});

// =============================================
// @route   DELETE /api/cart/clear
// @access  Private
// =============================================
const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], couponApplied: null, discountAmount: 0 }
  );

  res.status(200).json({
    success: true,
    message: "Cart cleared.",
  });
});

// =============================================
// @route   POST /api/cart/apply-coupon
// @access  Private
// =============================================
const applyCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400);
    throw new Error("Coupon code is required.");
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code.");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty.");
  }

  // ---- Validate coupon ----
  const { valid, message } = coupon.isValid(cart.subtotal, req.user._id);
  if (!valid) {
    res.status(400);
    throw new Error(message);
  }

  // ---- Calculate discount ----
  const discount = coupon.calculateDiscount(cart.subtotal);
  cart.couponApplied = coupon._id;
  cart.discountAmount = discount;
  await cart.save();

  res.status(200).json({
    success: true,
    message: `Coupon '${coupon.code}' applied! You save ₹${discount.toFixed(2)}.`,
    discountAmount: discount,
    totalAmount: cart.totalAmount,
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  });
});

// =============================================
// @route   DELETE /api/cart/remove-coupon
// @access  Private
// =============================================
const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  cart.couponApplied = null;
  cart.discountAmount = 0;
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Coupon removed.",
    totalAmount: cart.totalAmount,
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
};
