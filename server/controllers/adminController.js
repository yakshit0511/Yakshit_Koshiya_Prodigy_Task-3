/**
 * controllers/adminController.js
 * -----------------------------------------
 * Admin dashboard: statistics, user management,
 * revenue analytics and platform overview.
 * -----------------------------------------
 */

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const SupportTicket = require("../models/SupportTicket");
const { asyncHandler } = require("../middleware/errorHandler");

// =============================================
// @route   GET /api/admin/dashboard
// @access  Admin
// =============================================
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // ---- Parallel aggregation for speed ----
  const [
    totalUsers,
    newUsersThisMonth,
    totalProducts,
    totalOrders,
    ordersThisMonth,
    pendingOrders,
    revenueThisMonth,
    revenueLastMonth,
    pendingReviews,
    openTickets,
    lowStockCount,
    recentOrders,
    topProducts,
    orderStatusBreakdown,
  ] = await Promise.all([
    // User stats
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", createdAt: { $gte: startOfMonth } }),

    // Product stats
    Product.countDocuments({ isActive: true }),

    // Order stats
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Order.countDocuments({ orderStatus: { $in: ["Placed", "Confirmed", "Processing"] } }),

    // Revenue this month
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          paymentStatus: "Paid",
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    // Revenue last month
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          paymentStatus: "Paid",
        },
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),

    // Pending reviews
    Review.countDocuments({ isApproved: false }),

    // Open support tickets
    SupportTicket.countDocuments({ status: { $in: ["Open", "In Progress"] } }),

    // Low stock products
    Product.countDocuments({
      $expr: { $lte: ["$stock", "$lowStockThreshold"] },
      isActive: true,
    }),

    // Recent 5 orders
    Order.find()
      .populate("user", "name email")
      .sort("-createdAt")
      .limit(5)
      .select("orderNumber orderStatus totalAmount paymentMethod createdAt user"),

    // Top 5 products by order count
    Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]),

    // Order status breakdown
    Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const currentRevenue = revenueThisMonth[0]?.total || 0;
  const lastRevenue = revenueLastMonth[0]?.total || 0;
  const revenueGrowth =
    lastRevenue > 0
      ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100)
      : 100;

  res.status(200).json({
    success: true,
    stats: {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockCount,
      },
      orders: {
        total: totalOrders,
        thisMonth: ordersThisMonth,
        pending: pendingOrders,
        statusBreakdown: orderStatusBreakdown,
      },
      revenue: {
        thisMonth: currentRevenue,
        lastMonth: lastRevenue,
        growthPercent: revenueGrowth,
      },
      pendingReviews,
      openTickets,
    },
    recentOrders,
    topProducts,
  });
});

// =============================================
// @route   GET /api/admin/users
// @access  Admin
// =============================================
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isBlocked !== undefined)
    filter.isBlocked = req.query.isBlocked === "true";

  // Search by name or email
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .select("-password -resetPasswordToken -resetPasswordExpire -refreshToken"),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    users,
  });
});

// =============================================
// @route   GET /api/admin/users/:userId
// @access  Admin
// =============================================
const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select(
    "-password -resetPasswordToken -resetPasswordExpire -refreshToken"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  // ---- Get user's order summary ----
  const orderSummary = await Order.aggregate([
    { $match: { user: user._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    user,
    orderSummary: orderSummary[0] || { totalOrders: 0, totalSpent: 0 },
  });
});

// =============================================
// @route   PUT /api/admin/users/:userId/toggle-block
// @access  Admin
// =============================================
const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  if (user.role === "admin") {
    res.status(403);
    throw new Error("Cannot block an admin account.");
  }

  user.isBlocked = !user.isBlocked;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User ${user.isBlocked ? "blocked" : "unblocked"} successfully.`,
    isBlocked: user.isBlocked,
  });
});

// =============================================
// @route   PUT /api/admin/users/:userId/role
// @access  Admin
// =============================================
const changeUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!["customer", "admin"].includes(role)) {
    res.status(400);
    throw new Error("Role must be 'customer' or 'admin'.");
  }

  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { role },
    { new: true }
  ).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  res.status(200).json({
    success: true,
    message: `User role changed to '${role}'.`,
    user,
  });
});

// =============================================
// @route   GET /api/admin/revenue/chart
// @access  Admin
// @desc    Monthly revenue for the last 12 months
// =============================================
const getRevenueChart = asyncHandler(async (req, res) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const data = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: twelveMonthsAgo },
        paymentStatus: "Paid",
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  res.status(200).json({ success: true, revenueData: data });
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  toggleBlockUser,
  changeUserRole,
  getRevenueChart,
};
