/**
 * controllers/orderController.js
 * -----------------------------------------
 * Complete order lifecycle management:
 * Customer: Place, View, Cancel, Return, Invoice, Razorpay
 * Admin: List all, Update status, Payment status, Stats
 * -----------------------------------------
 */

const crypto = require("crypto");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendEmail } = require("../utils/sendEmail");
const generateInvoice = require("../utils/generateInvoice");
const { clearCachePattern } = require("../utils/cache");

// ---- Shipping config ----
const FREE_SHIPPING_ABOVE = 500;
const SHIPPING_CHARGE = 50;

// =============================================
// @route   POST /api/orders/place
// @access  Private (Customer)
// =============================================
const placeOrder = asyncHandler(async (req, res) => {
  const { addressId, newAddress, paymentMethod, notes } = req.body;

  if (!paymentMethod || !["COD", "Online"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("paymentMethod must be 'COD' or 'Online'.");
  }
  if (!addressId && !newAddress) {
    res.status(400);
    throw new Error("A delivery address is required (addressId or newAddress).");
  }

  // ---- Get cart with product details ----
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({ path: "items.product", select: "name images price discountPrice stock isActive isInStock" })
    .populate("couponApplied");

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty. Add products before placing an order.");
  }

  // ---- Get delivery address ----
  const user = await User.findById(req.user._id);
  let shippingAddress;

  if (addressId) {
    const saved = user.addresses.id(addressId);
    if (!saved) {
      res.status(404);
      throw new Error("Saved address not found. Please select a valid address.");
    }
    shippingAddress = {
      name: user.name,
      phone: user.phone || "",
      street: saved.street,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    };
  } else {
    const { street, city, state, pincode, phone } = newAddress;
    if (!street || !city || !state || !pincode) {
      res.status(400);
      throw new Error("New address requires street, city, state and pincode.");
    }
    shippingAddress = {
      name: user.name,
      phone: phone || user.phone || "",
      street, city, state, pincode,
    };
  }

  // ---- Validate stock and build order items ----
  const orderItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      res.status(400);
      throw new Error(`"${item.product?.name || "A product"}" is no longer available. Please remove it from your cart.`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Required: ${item.quantity}.`);
    }

    const effectivePrice = product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice : product.price;
    const totalPrice = effectivePrice * item.quantity;
    subtotal += totalPrice;

    orderItems.push({
      product: product._id,
      productName: product.name,
      productImage: product.images?.[0]?.url || "",
      quantity: item.quantity,
      price: product.price,
      discountPrice: product.discountPrice || null,
      totalPrice,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;

  // ---- Coupon discount ----
  let discountAmount = 0;
  let couponSnapshot = {};
  if (cart.couponApplied) {
    const coupon = cart.couponApplied;
    const { valid } = coupon.isValid(subtotal, req.user._id);
    if (valid) {
      discountAmount = coupon.calculateDiscount(subtotal);
      couponSnapshot = {
        couponId: coupon._id,
        code: coupon.code,
        discountSaved: discountAmount,
      };
    }
  }

  const afterDiscount = subtotal - discountAmount;
  const shippingCharge = afterDiscount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_CHARGE;
  const totalAmount = Math.round((afterDiscount + shippingCharge) * 100) / 100;

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  // ---- For Online payment: create Razorpay order first ----
  if (paymentMethod === "Online") {
    let razorpayOrderId = null;
    try {
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // in paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
      razorpayOrderId = rzpOrder.id;
    } catch (rzpErr) {
      res.status(500);
      throw new Error("Failed to initialize payment. Please try again or choose COD.");
    }

    // Create the order in Pending state (confirmed after payment verification)
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: "Online",
      paymentStatus: "Pending",
      orderStatus: "Placed",
      subtotal,
      discountAmount,
      shippingCharge,
      totalAmount,
      couponApplied: couponSnapshot,
      estimatedDelivery,
      notes: notes || "",
      paymentDetails: { transactionId: razorpayOrderId, gateway: "Razorpay" },
    });

    return res.status(201).json({
      success: true,
      message: "Order created. Complete payment to confirm.",
      requiresPayment: true,
      razorpay: {
        orderId: razorpayOrderId,
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
        prefill: { name: user.name, email: user.email, contact: user.phone || "" },
      },
      order,
    });
  }

  // ---- COD: Create confirmed order immediately ----
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod: "COD",
    paymentStatus: "Pending",
    orderStatus: "Placed",
    subtotal,
    discountAmount,
    shippingCharge,
    totalAmount,
    couponApplied: couponSnapshot,
    estimatedDelivery,
    notes: notes || "",
  });

  // ---- Post-order operations ----
  await _postOrderOperations(order, cart, req.user._id);

  res.status(201).json({
    success: true,
    message: `Order #${order.orderNumber} placed successfully!`,
    order,
  });
});

// =============================================
// HELPER — Actions after order is confirmed
// =============================================
const _postOrderOperations = async (order, cart, userId) => {
  // Deduct stock
  for (const item of order.items) {
    const product = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (product && product.stock <= 0) {
      product.isInStock = false;
      await product.save({ validateBeforeSave: false });
    }
  }

  // Mark coupon as used
  if (order.couponApplied?.couponId) {
    await Coupon.findByIdAndUpdate(order.couponApplied.couponId, {
      $inc: { usedCount: 1 },
      $addToSet: { usedBy: userId },
    });
  }

  // Clear cart
  await Cart.findOneAndUpdate(
    { user: userId },
    { items: [], couponApplied: null, discountAmount: 0, subtotal: 0, totalAmount: 0 }
  );

  // Send confirmation email (non-blocking)
  const user = await User.findById(userId).select("name email");
  if (user) {
    sendEmail({ to: user.email, template: "orderConfirmation", data: { user, order } })
      .catch((e) => console.error("Order email failed:", e.message));
  }
  clearCachePattern("admin:");
};

// =============================================
// @route   POST /api/orders/verify-payment
// @access  Private
// =============================================
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
    res.status(400);
    throw new Error("razorpayOrderId, razorpayPaymentId, razorpaySignature and orderId are required.");
  }

  // ---- Verify HMAC signature ----
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSig !== razorpaySignature) {
    res.status(400);
    throw new Error("Payment verification failed. Invalid signature.");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied.");
  }

  // ---- Update order ----
  order.paymentStatus = "Paid";
  order.orderStatus = "Confirmed";
  order.paymentDetails = {
    transactionId: razorpayPaymentId,
    gateway: "Razorpay",
    paidAt: new Date(),
  };
  order.statusHistory.push({
    status: "Confirmed",
    changedAt: new Date(),
    note: `Payment confirmed. TxnID: ${razorpayPaymentId}`,
  });
  await order.save();

  // ---- Post-order operations ----
  const cart = await Cart.findOne({ user: req.user._id });
  if (cart) await _postOrderOperations(order, cart, req.user._id);

  res.status(200).json({
    success: true,
    message: "Payment verified. Order confirmed!",
    order,
  });
});

// =============================================
// @route   GET /api/orders/my-orders
// @access  Private
// =============================================
const getMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(20, parseInt(req.query.limit, 10) || 10);
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) filter.orderStatus = req.query.status;

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .select("-statusHistory"),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    orders,
  });
});

// =============================================
// @route   GET /api/orders/my-orders/:orderId
// @access  Private
// =============================================
const getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user._id,
  })
    .populate("items.product", "name slug images")
    .populate("statusHistory.updatedBy", "name role");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  res.status(200).json({ success: true, order });
});

// =============================================
// @route   POST /api/orders/:orderId/cancel
// @access  Private
// =============================================
const cancelOrder = asyncHandler(async (req, res) => {
  const { cancelReason } = req.body;
  if (!cancelReason || !cancelReason.trim()) {
    res.status(400);
    throw new Error("cancelReason is required.");
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user._id,
  });
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  const cancellable = ["Placed", "Confirmed"];
  if (!cancellable.includes(order.orderStatus)) {
    res.status(400);
    throw new Error(
      `Order cannot be cancelled once it is "${order.orderStatus}". Contact support for help.`
    );
  }

  order.orderStatus = "Cancelled";
  order.cancelReason = cancelReason.trim();
  if (order.paymentStatus === "Paid") {
    order.paymentStatus = "Refunded";
  }
  order.statusHistory.push({
    status: "Cancelled",
    changedAt: new Date(),
    updatedBy: req.user._id,
    note: `Customer cancelled: ${cancelReason}`,
  });
  await order.save();

  // ---- Restore stock ----
  for (const item of order.items) {
    const updated = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } },
      { new: true }
    );
    if (updated && updated.stock > 0 && !updated.isInStock) {
      updated.isInStock = true;
      await updated.save({ validateBeforeSave: false });
    }
  }

  // Send cancellation email
  const user = await User.findById(req.user._id).select("name email");
  if (user) {
    sendEmail({ to: user.email, template: "orderStatusUpdate", data: { user, order } })
      .catch((e) => console.error("Cancel email failed:", e.message));
  }

  clearCachePattern("admin:");

  res.status(200).json({
    success: true,
    message: "Order cancelled. Stock has been restored.",
    order,
  });
});

// =============================================
// @route   POST /api/orders/:orderId/return-request
// @access  Private
// =============================================
const requestReturn = asyncHandler(async (req, res) => {
  const { returnReason } = req.body;
  if (!returnReason || !returnReason.trim()) {
    res.status(400);
    throw new Error("returnReason is required.");
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user._id,
  });
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.orderStatus !== "Delivered") {
    res.status(400);
    throw new Error("Return can only be requested for delivered orders.");
  }

  order.orderStatus = "Return Requested";
  order.returnReason = returnReason.trim();
  order.statusHistory.push({
    status: "Return Requested",
    changedAt: new Date(),
    updatedBy: req.user._id,
    note: `Return reason: ${returnReason}`,
  });
  await order.save();

  clearCachePattern("admin:");

  res.status(200).json({
    success: true,
    message: "Return request submitted. Our team will contact you within 24 hours.",
    order,
  });
});

// =============================================
// @route   GET /api/orders/:orderId/invoice
// @access  Private (owner or admin)
// =============================================
const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate("user", "name email phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied.");
  }

  const eligibleStatuses = ["Delivered", "Shipped", "Out for Delivery", "Placed", "Confirmed", "Processing"];
  if (!eligibleStatuses.includes(order.orderStatus)) {
    res.status(400);
    throw new Error("Invoice not available for cancelled or returned orders.");
  }

  const pdfBuffer = await generateInvoice(order, order.user);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  );
  res.send(pdfBuffer);
});

// =============================================
// ---- ADMIN ROUTES ----
// =============================================

// @route   GET /api/admin/orders
// @access  Admin
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 15);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.orderStatus) filter.orderStatus = req.query.orderStatus;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  if (req.query.search) {
    const search = req.query.search.trim();
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { user: { $in: matchingUsers.map((u) => u._id) } },
    ];
  }

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    orders,
  });
});

// @route   GET /api/admin/orders/:orderId
// @access  Admin
const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate("user", "name email phone addresses")
    .populate("items.product", "name slug images sku")
    .populate("statusHistory.updatedBy", "name role");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  res.status(200).json({ success: true, order });
});

// @route   PUT /api/admin/orders/:orderId/status
// @access  Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { newStatus, note } = req.body;

  const validStatuses = [
    "Placed", "Confirmed", "Processing", "Shipped",
    "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned",
  ];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    res.status(400);
    throw new Error(`newStatus must be one of: ${validStatuses.join(", ")}`);
  }

  const order = await Order.findById(req.params.orderId)
    .populate("user", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.orderStatus = newStatus;
  order.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    updatedBy: req.user._id,
    note: note || "",
  });

  if (newStatus === "Shipped") {
    const eta = new Date();
    eta.setDate(eta.getDate() + 3);
    order.estimatedDelivery = eta;
  }
  if (newStatus === "Delivered") {
    order.deliveredAt = new Date();
    if (order.paymentMethod === "COD") order.paymentStatus = "Paid";
  }

  await order.save();

  // Email notification
  if (order.user) {
    sendEmail({ to: order.user.email, template: "orderStatusUpdate", data: { user: order.user, order } })
      .catch((e) => console.error("Status email failed:", e.message));
  }

  clearCachePattern("admin:");

  res.status(200).json({
    success: true,
    message: `Order status updated to "${newStatus}".`,
    order,
  });
});

// @route   PUT /api/admin/orders/:orderId/payment-status
// @access  Admin
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const valid = ["Pending", "Paid", "Failed", "Refunded"];
  if (!paymentStatus || !valid.includes(paymentStatus)) {
    res.status(400);
    throw new Error(`paymentStatus must be one of: ${valid.join(", ")}`);
  }

  const order = await Order.findByIdAndUpdate(
    req.params.orderId,
    {
      paymentStatus,
      ...(paymentStatus === "Paid" && { "paymentDetails.paidAt": new Date() }),
    },
    { new: true }
  );
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  clearCachePattern("admin:");

  res.status(200).json({
    success: true,
    message: `Payment status updated to "${paymentStatus}".`,
    order,
  });
});

// @route   GET /api/admin/orders/stats
// @access  Admin
const getOrderStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordersToday,
    ordersWeek,
    ordersMonth,
    revenueToday,
    revenueWeek,
    revenueMonth,
    byStatus,
    topProducts,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: todayStart } }),
    Order.countDocuments({ createdAt: { $gte: weekStart } }),
    Order.countDocuments({ createdAt: { $gte: monthStart } }),

    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: weekStart }, paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: monthStart }, paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Order.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", name: { $first: "$items.productName" }, image: { $first: "$items.productImage" }, unitsSold: { $sum: "$items.quantity" }, revenue: { $sum: "$items.totalPrice" } } },
      { $sort: { unitsSold: -1 } },
      { $limit: 10 },
    ]),

    Order.find()
      .populate("user", "name email")
      .sort("-createdAt")
      .limit(10)
      .select("orderNumber orderStatus totalAmount paymentMethod createdAt user"),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      orders: { today: ordersToday, week: ordersWeek, month: ordersMonth },
      revenue: {
        today: revenueToday[0]?.total || 0,
        week: revenueWeek[0]?.total || 0,
        month: revenueMonth[0]?.total || 0,
      },
      byStatus,
    },
    topProducts,
    recentOrders,
  });
});

module.exports = {
  placeOrder,
  verifyPayment,
  getMyOrders,
  getMyOrderById,
  cancelOrder,
  requestReturn,
  downloadInvoice,
  getAllOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStats,
};
