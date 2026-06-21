/**
 * controllers/orderController.js
 * -----------------------------------------
 * Order lifecycle management:
 * - Place order (from cart or direct)
 * - Get user orders / single order
 * - Admin: list all orders, update status
 * - Razorpay payment integration
 * - Invoice download
 * - Cancel / Return order
 * -----------------------------------------
 */

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendEmail } = require("../utils/sendEmail");
const generateInvoice = require("../utils/generateInvoice");
const ApiFeatures = require("../utils/apiFeatures");

// =============================================
// @route   POST /api/orders/place
// @access  Private
// =============================================
const placeOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod, notes } = req.body;

  if (!addressId || !paymentMethod) {
    res.status(400);
    throw new Error("Delivery address and payment method are required.");
  }

  if (!["COD", "Online"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Payment method must be COD or Online.");
  }

  // ---- Get user's cart ----
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product couponApplied"
  );

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty. Add products before placing an order.");
  }

  // ---- Get shipping address from user ----
  const user = await User.findById(req.user._id);
  const address = user.addresses.id(addressId);
  if (!address) {
    res.status(404);
    throw new Error("Selected delivery address not found.");
  }

  // ---- Validate stock and build order items ----
  const orderItems = [];
  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isActive) {
      res.status(400);
      throw new Error(`Product '${item.product?.name || "unknown"}' is no longer available.`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(
        `Insufficient stock for '${product.name}'. Available: ${product.stock}, Required: ${item.quantity}.`
      );
    }

    const effectivePrice =
      item.discountPrice && item.discountPrice < item.price
        ? item.discountPrice
        : item.price;

    orderItems.push({
      product: product._id,
      productName: product.name,
      productImage: product.images?.[0]?.url || "",
      quantity: item.quantity,
      price: item.price,
      discountPrice: item.discountPrice,
      totalPrice: effectivePrice * item.quantity,
    });
  }

  // ---- Build shipping address snapshot ----
  const shippingAddress = {
    name: user.name,
    phone: user.phone || "",
    street: address.street,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  };

  // ---- Calculate shipping charge (free above ₹499) ----
  const shippingCharge = cart.subtotal >= 499 ? 0 : 49;

  // ---- Estimated delivery (5 business days from now) ----
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  // ---- Coupon details snapshot ----
  let couponApplied = {};
  if (cart.couponApplied) {
    couponApplied = {
      couponId: cart.couponApplied._id,
      code: cart.couponApplied.code,
      discountSaved: cart.discountAmount,
    };
  }

  // ---- Create order ----
  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === "COD" ? "Pending" : "Pending",
    subtotal: cart.subtotal,
    discountAmount: cart.discountAmount,
    shippingCharge,
    totalAmount: cart.subtotal - cart.discountAmount + shippingCharge,
    couponApplied,
    estimatedDelivery,
    notes: notes || "",
  });

  // ---- Decrement stock for each product ----
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stock: -item.quantity },
    });
    // Re-check stock status
    const updatedProduct = await Product.findById(item.product._id);
    if (updatedProduct) {
      updatedProduct.isInStock = updatedProduct.stock > 0;
      await updatedProduct.save({ validateBeforeSave: false });
    }
  }

  // ---- Mark coupon as used ----
  if (cart.couponApplied) {
    await Coupon.findByIdAndUpdate(cart.couponApplied._id, {
      $inc: { usedCount: 1 },
      $push: { usedBy: req.user._id },
    });
  }

  // ---- Clear the cart ----
  await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], couponApplied: null, discountAmount: 0, subtotal: 0, totalAmount: 0 }
  );

  // ---- Send order confirmation email (non-blocking) ----
  sendEmail({
    to: user.email,
    template: "orderConfirmation",
    data: { user, order },
  }).catch((err) => console.error("Order confirmation email failed:", err.message));

  res.status(201).json({
    success: true,
    message: "Order placed successfully!",
    order,
  });
});

// =============================================
// @route   GET /api/orders/my-orders
// @access  Private
// =============================================
const getMyOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) filter.orderStatus = req.query.status;

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .select("-statusHistory -__v"),
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
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
// =============================================
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email phone")
    .populate("items.product", "name slug images")
    .populate("couponApplied.couponId", "code discountType discountValue");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  // ---- Ensure user can only see their own orders (unless admin) ----
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Access denied. You can only view your own orders.");
  }

  res.status(200).json({ success: true, order });
});

// =============================================
// @route   GET /api/orders/admin/all
// @access  Admin
// =============================================
const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.orderStatus = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

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

// =============================================
// @route   PUT /api/orders/:id/status
// @access  Admin
// =============================================
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const validStatuses = [
    "Placed", "Confirmed", "Processing", "Shipped",
    "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned",
  ];

  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.orderStatus = status;
  order.statusHistory.push({
    status,
    changedAt: new Date(),
    updatedBy: req.user._id,
    note: note || "",
  });

  // ---- Auto-set deliveredAt on delivery ----
  if (status === "Delivered") {
    order.deliveredAt = new Date();
    order.paymentStatus = "Paid"; // Auto-mark COD as paid on delivery
  }

  await order.save();

  // ---- Send status update email (non-blocking) ----
  sendEmail({
    to: order.user.email,
    template: "orderStatusUpdate",
    data: { user: order.user, order },
  }).catch((err) => console.error("Status update email failed:", err.message));

  res.status(200).json({
    success: true,
    message: `Order status updated to '${status}'.`,
    order,
  });
});

// =============================================
// @route   PUT /api/orders/:id/cancel
// @access  Private (owner can cancel before Shipped)
// =============================================
const cancelOrder = asyncHandler(async (req, res) => {
  const { cancelReason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  // ---- Ensure ownership ----
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied.");
  }

  // ---- Only allow cancel for early statuses ----
  const cancellableStatuses = ["Placed", "Confirmed", "Processing"];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    res.status(400);
    throw new Error(
      `Order cannot be cancelled once it is '${order.orderStatus}'.`
    );
  }

  order.orderStatus = "Cancelled";
  order.cancelReason = cancelReason || "Cancelled by customer";
  order.statusHistory.push({
    status: "Cancelled",
    changedAt: new Date(),
    updatedBy: req.user._id,
  });

  // ---- Restore product stock ----
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully.",
    order,
  });
});

// =============================================
// @route   PUT /api/orders/:id/return
// @access  Private
// =============================================
const requestReturn = asyncHandler(async (req, res) => {
  const { returnReason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Access denied.");
  }

  if (order.orderStatus !== "Delivered") {
    res.status(400);
    throw new Error("Return can only be requested for delivered orders.");
  }

  order.orderStatus = "Return Requested";
  order.returnReason = returnReason || "";
  order.statusHistory.push({
    status: "Return Requested",
    changedAt: new Date(),
    updatedBy: req.user._id,
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Return request submitted. Our team will contact you shortly.",
    order,
  });
});

// =============================================
// @route   GET /api/orders/:id/invoice
// @access  Private (owner or admin)
// =============================================
const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email phone"
  );

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Access denied.");
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
// @route   POST /api/orders/razorpay/create
// @access  Private
// =============================================
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body; // Amount in paise (₹ × 100)

  if (!amount || amount < 100) {
    res.status(400);
    throw new Error("Invalid amount.");
  }

  try {
    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(amount),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500);
    throw new Error("Failed to create Razorpay order: " + err.message);
  }
});

// =============================================
// @route   POST /api/orders/razorpay/verify
// @access  Private
// =============================================
const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const crypto = require("crypto");
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
  } = req.body;

  // ---- Verify signature ----
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error("Payment verification failed. Invalid signature.");
  }

  // ---- Update order payment status ----
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.paymentStatus = "Paid";
  order.paymentDetails = {
    transactionId: razorpay_payment_id,
    gateway: "Razorpay",
    paidAt: new Date(),
  };
  order.orderStatus = "Confirmed";
  order.statusHistory.push({
    status: "Confirmed",
    changedAt: new Date(),
    note: `Payment received via Razorpay. TxnID: ${razorpay_payment_id}`,
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Payment verified and order confirmed.",
    order,
  });
});

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatus,
  cancelOrder,
  requestReturn,
  downloadInvoice,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
