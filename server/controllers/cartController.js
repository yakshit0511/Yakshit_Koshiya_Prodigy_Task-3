/**
 * controllers/cartController.js
 * -----------------------------------------
 * Complete shopping cart operations:
 * - Get cart with live price sync & stock validation
 * - Add / update / remove items with stock checks
 * - Apply / remove coupons with full validation
 * - Auto-calculate: subtotal, shipping, discount, total
 * -----------------------------------------
 */

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const { asyncHandler } = require("../middleware/errorHandler");

// ---- Shipping thresholds ----
const FREE_SHIPPING_ABOVE = 500; // ₹500
const SHIPPING_CHARGE = 50; // ₹50 flat

// =============================================
// HELPER — Build populated, recalculated cart response
// Fetches cart from DB with full product details,
// syncs prices, checks stock, calculates all totals.
// =============================================
const buildCartResponse = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name slug images price discountPrice stock isInStock unit isActive",
  }).populate("couponApplied", "code discountType discountValue maxDiscountAmount description");

  if (!cart || cart.items.length === 0) {
    return {
      items: [],
      couponApplied: null,
      subtotal: 0,
      discountAmount: 0,
      shippingCharge: 0,
      totalAmount: 0,
      itemCount: 0,
    };
  }

  let subtotal = 0;
  const priceChanges = [];
  const stockIssues = [];

  // ---- Process each item ----
  const processedItems = cart.items.map((item) => {
    const product = item.product;

    // Product was deleted / deactivated
    if (!product || !product.isActive) {
      stockIssues.push({ productId: item.product, reason: "Product no longer available" });
      return null;
    }

    // Current effective price
    const currentPrice =
      product.discountPrice && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

    // Detect price change since item was added
    const savedEffective = item.discountPrice && item.discountPrice < item.price
      ? item.discountPrice : item.price;

    if (Math.abs(currentPrice - savedEffective) > 0.01) {
      priceChanges.push({
        productName: product.name,
        oldPrice: savedEffective,
        newPrice: currentPrice,
      });
      // Update snapshot in memory (will be saved by caller)
      item.price = product.price;
      item.discountPrice = product.discountPrice;
    }

    // Stock status
    const outOfStock = !product.isInStock || product.stock === 0;
    const insufficientStock = !outOfStock && product.stock < item.quantity;

    if (outOfStock || insufficientStock) {
      stockIssues.push({
        productName: product.name,
        availableStock: product.stock,
        requestedQty: item.quantity,
      });
    }

    const lineTotal = currentPrice * item.quantity;
    subtotal += lineTotal;

    return {
      _id: item._id,
      product,
      quantity: item.quantity,
      price: item.price,
      discountPrice: item.discountPrice,
      effectivePrice: currentPrice,
      lineTotal,
      outOfStock,
      insufficientStock: insufficientStock && !outOfStock,
    };
  }).filter(Boolean); // Remove nulls (deleted products)

  subtotal = Math.round(subtotal * 100) / 100;

  // ---- Coupon discount ----
  let discountAmount = 0;
  let couponInfo = null;
  if (cart.couponApplied) {
    const coupon = cart.couponApplied;
    const { valid } = coupon.isValid ? coupon.isValid(subtotal, userId) : { valid: true };
    if (valid) {
      if (coupon.discountType === "percentage") {
        discountAmount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else {
        discountAmount = Math.min(coupon.discountValue, subtotal);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
      couponInfo = {
        _id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      };
    } else {
      // Coupon no longer valid, remove it silently
      cart.couponApplied = null;
      await cart.save({ validateBeforeSave: false });
    }
  }

  const afterDiscount = subtotal - discountAmount;
  const shippingCharge = afterDiscount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_CHARGE;
  const totalAmount = Math.round((afterDiscount + shippingCharge) * 100) / 100;

  return {
    _id: cart._id,
    items: processedItems,
    couponApplied: couponInfo,
    subtotal,
    discountAmount,
    shippingCharge,
    totalAmount,
    freeShippingEligible: afterDiscount >= FREE_SHIPPING_ABOVE,
    amountForFreeShipping: Math.max(0, FREE_SHIPPING_ABOVE - afterDiscount),
    itemCount: processedItems.reduce((sum, i) => sum + i.quantity, 0),
    priceChanges: priceChanges.length > 0 ? priceChanges : undefined,
    stockIssues: stockIssues.length > 0 ? stockIssues : undefined,
  };
};

// =============================================
// @route   GET /api/cart
// @access  Private
// =============================================
const getCart = asyncHandler(async (req, res) => {
  const cart = await buildCartResponse(req.user._id);
  res.status(200).json({ success: true, cart });
});

// =============================================
// @route   POST /api/cart/add
// @access  Private
// =============================================
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error("productId is required.");
  }

  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  // ---- Validate product ----
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found or is no longer available.");
  }
  if (product.stock <= 0 || !product.isInStock) {
    res.status(400);
    throw new Error("This product is currently out of stock.");
  }

  // ---- Get or create cart ----
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // ---- Check if product already in cart ----
  const existingIdx = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingIdx > -1) {
    const newQty = cart.items[existingIdx].quantity + qty;
    if (newQty > product.stock) {
      res.status(400);
      throw new Error(
        `Cannot add ${qty} more. Only ${product.stock} unit(s) available and you already have ${cart.items[existingIdx].quantity} in your cart.`
      );
    }
    cart.items[existingIdx].quantity = newQty;
    // Refresh price snapshot
    cart.items[existingIdx].price = product.price;
    cart.items[existingIdx].discountPrice = product.discountPrice || null;
  } else {
    if (qty > product.stock) {
      res.status(400);
      throw new Error(
        `Only ${product.stock} unit(s) available. You requested ${qty}.`
      );
    }
    cart.items.push({
      product: productId,
      quantity: qty,
      price: product.price,
      discountPrice: product.discountPrice || null,
    });
  }

  await cart.save();

  const cartData = await buildCartResponse(req.user._id);
  res.status(200).json({
    success: true,
    message: `"${product.name}" added to cart.`,
    cart: cartData,
  });
});

// =============================================
// @route   PUT /api/cart/update/:productId
// @access  Private
// =============================================
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) {
    res.status(400);
    throw new Error("quantity is required.");
  }

  const qty = parseInt(quantity, 10);

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  const itemIdx = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );
  if (itemIdx === -1) {
    res.status(404);
    throw new Error("Product not in cart.");
  }

  // ---- Quantity 0 = remove item ----
  if (qty <= 0) {
    cart.items.splice(itemIdx, 1);
    await cart.save();
    const cartData = await buildCartResponse(req.user._id);
    return res.status(200).json({
      success: true,
      message: "Item removed from cart.",
      cart: cartData,
    });
  }

  // ---- Validate stock ----
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }
  if (qty > product.stock) {
    res.status(400);
    throw new Error(
      `Only ${product.stock} unit(s) in stock. Cannot set quantity to ${qty}.`
    );
  }

  cart.items[itemIdx].quantity = qty;
  cart.items[itemIdx].price = product.price;
  cart.items[itemIdx].discountPrice = product.discountPrice || null;
  await cart.save();

  const cartData = await buildCartResponse(req.user._id);
  res.status(200).json({
    success: true,
    message: "Cart updated.",
    cart: cartData,
  });
});

// =============================================
// @route   DELETE /api/cart/remove/:productId
// @access  Private
// =============================================
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  const before = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  if (cart.items.length === before) {
    res.status(404);
    throw new Error("Product not found in cart.");
  }

  await cart.save();

  const cartData = await buildCartResponse(req.user._id);
  res.status(200).json({
    success: true,
    message: "Item removed from cart.",
    cart: cartData,
  });
});

// =============================================
// @route   DELETE /api/cart/clear
// @access  Private
// =============================================
const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    {
      items: [],
      couponApplied: null,
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
    },
    { upsert: false }
  );

  res.status(200).json({
    success: true,
    message: "Cart cleared.",
    cart: {
      items: [],
      couponApplied: null,
      subtotal: 0,
      discountAmount: 0,
      shippingCharge: 0,
      totalAmount: 0,
      itemCount: 0,
    },
  });
});

// =============================================
// @route   POST /api/cart/apply-coupon
// @access  Private
// =============================================
const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode || !couponCode.trim()) {
    res.status(400);
    throw new Error("Coupon code is required.");
  }

  const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
  if (!coupon) {
    res.status(404);
    throw new Error("Invalid coupon code. Please check and try again.");
  }

  // ---- Get cart to calculate subtotal ----
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: "items.product",
    select: "price discountPrice",
  });

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty. Add products before applying a coupon.");
  }

  // Calculate live subtotal
  let subtotal = 0;
  for (const item of cart.items) {
    if (item.product) {
      const ep = item.product.discountPrice && item.product.discountPrice < item.product.price
        ? item.product.discountPrice : item.product.price;
      subtotal += ep * item.quantity;
    }
  }

  // ---- Full coupon validation ----
  const { valid, message } = coupon.isValid(subtotal, req.user._id);
  if (!valid) {
    res.status(400);
    throw new Error(message);
  }

  // ---- Calculate discount ----
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, subtotal);
  }
  discountAmount = Math.round(discountAmount * 100) / 100;

  // ---- Save coupon to cart ----
  cart.couponApplied = coupon._id;
  cart.discountAmount = discountAmount;
  await cart.save();

  const cartData = await buildCartResponse(req.user._id);

  res.status(200).json({
    success: true,
    message: `🎉 Coupon "${coupon.code}" applied! You save ₹${discountAmount.toFixed(2)}.`,
    discountBreakdown: {
      code: coupon.code,
      type: coupon.discountType,
      value: coupon.discountValue,
      discountAmount,
    },
    cart: cartData,
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

  if (!cart.couponApplied) {
    res.status(400);
    throw new Error("No coupon is currently applied.");
  }

  cart.couponApplied = null;
  cart.discountAmount = 0;
  await cart.save();

  const cartData = await buildCartResponse(req.user._id);
  res.status(200).json({
    success: true,
    message: "Coupon removed.",
    cart: cartData,
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
  buildCartResponse, // Export for use in orderController
};
