/**
 * controllers/adminController.js
 * -----------------------------------------
 * Admin-only endpoints:
 * - Comprehensive dashboard statistics
 * - Revenue chart data (daily + monthly)
 * - Top selling products
 * - Recent activity feed
 * - Customer management (list, view, block)
 * -----------------------------------------
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const SupportTicket = require("../models/SupportTicket");
const { asyncHandler } = require("../middleware/errorHandler");

// =============================================
// @route   GET /api/admin/dashboard/stats
// @access  Admin
// =============================================
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    totalOrders,
    ordersThisMonth,
    ordersLastMonth,
    totalCustomers,
    newCustomersThisMonth,
    activeProducts,
    lowStockProducts,
    openTickets,
    pendingReviews,
  ] = await Promise.all([
    // Revenue
    Order.aggregate([
      { $match: { paymentStatus: "Paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "Paid", createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: "Paid", createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    // Orders
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: monthStart } }),
    Order.countDocuments({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }),
    // Users
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", createdAt: { $gte: monthStart } }),
    // Products
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } }),
    // Support & Reviews
    SupportTicket.countDocuments({ status: { $in: ["Open", "In Progress"] } }),
    Review.countDocuments({ isApproved: false }),
  ]);

  const thisMonthRevenue = revenueThisMonth[0]?.total || 0;
  const lastMonthRevenue = revenueLastMonth[0]?.total || 0;
  const revenueGrowth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 100;

  const ordersGrowth = ordersLastMonth > 0
    ? Math.round(((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100)
    : 100;

  res.status(200).json({
    success: true,
    stats: {
      revenue: {
        allTime: totalRevenue[0]?.total || 0,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growthPercent: revenueGrowth,
      },
      orders: {
        allTime: totalOrders,
        thisMonth: ordersThisMonth,
        lastMonth: ordersLastMonth,
        growthPercent: ordersGrowth,
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
      },
      products: {
        active: activeProducts,
        lowStock: lowStockProducts,
      },
      openTickets,
      pendingReviews,
    },
  });
});

// =============================================
// @route   GET /api/admin/dashboard/revenue-chart
// @access  Admin
// Returns daily revenue for last 30 days +
// monthly revenue for last 12 months
// =============================================
const getRevenueChart = asyncHandler(async (req, res) => {
  const now = new Date();

  // ---- Daily — last 30 days ----
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const dailyRevenue = await Order.aggregate([
    {
      $match: {
        paymentStatus: "Paid",
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  // Format daily data for recharts
  const dailyData = dailyRevenue.map((d) => ({
    date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
    revenue: Math.round(d.revenue * 100) / 100,
    orders: d.orders,
  }));

  // ---- Monthly — last 12 months ----
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const monthlyRevenue = await Order.aggregate([
    {
      $match: {
        paymentStatus: "Paid",
        createdAt: { $gte: twelveMonthsAgo },
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

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyData = monthlyRevenue.map((m) => ({
    month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
    revenue: Math.round(m.revenue * 100) / 100,
    orders: m.orders,
  }));

  res.status(200).json({
    success: true,
    daily: dailyData,
    monthly: monthlyData,
  });
});

// =============================================
// @route   GET /api/admin/dashboard/top-products
// @access  Admin
// =============================================
const getTopProducts = asyncHandler(async (req, res) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const topProducts = await Order.aggregate([
    { $match: { createdAt: { $gte: monthStart } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        productName: { $first: "$items.productName" },
        productImage: { $first: "$items.productImage" },
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.totalPrice" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    success: true,
    count: topProducts.length,
    topProducts,
  });
});

// =============================================
// @route   GET /api/admin/dashboard/recent-activity
// @access  Admin
// Returns last 20 activities across orders, 
// registrations, reviews, support tickets
// =============================================
const getRecentActivity = asyncHandler(async (req, res) => {
  const [recentOrders, recentUsers, recentReviews, recentTickets] = await Promise.all([
    Order.find()
      .populate("user", "name email")
      .sort("-createdAt")
      .limit(6)
      .select("orderNumber orderStatus totalAmount user createdAt"),

    User.find({ role: "customer" })
      .sort("-createdAt")
      .limit(5)
      .select("name email createdAt"),

    Review.find()
      .populate("user", "name")
      .populate("product", "name slug")
      .sort("-createdAt")
      .limit(5)
      .select("rating comment isApproved user product createdAt"),

    SupportTicket.find()
      .populate("user", "name")
      .sort("-createdAt")
      .limit(4)
      .select("ticketNumber subject status priority user createdAt"),
  ]);

  // ---- Merge and sort by date ----
  const activities = [
    ...recentOrders.map((o) => ({
      type: "order",
      icon: "🛍️",
      message: `New order #${o.orderNumber} (₹${o.totalAmount}) by ${o.user?.name || "Guest"}`,
      status: o.orderStatus,
      timestamp: o.createdAt,
      link: `/admin/orders/${o._id}`,
    })),
    ...recentUsers.map((u) => ({
      type: "registration",
      icon: "👤",
      message: `New customer registered: ${u.name} (${u.email})`,
      timestamp: u.createdAt,
      link: `/admin/customers/${u._id}`,
    })),
    ...recentReviews.map((r) => ({
      type: "review",
      icon: "⭐",
      message: `New ${r.rating}-star review for "${r.product?.name}" by ${r.user?.name}`,
      status: r.isApproved ? "Approved" : "Pending",
      timestamp: r.createdAt,
      link: `/admin/reviews`,
    })),
    ...recentTickets.map((t) => ({
      type: "ticket",
      icon: "🎫",
      message: `New support ticket #${t.ticketNumber}: "${t.subject}" by ${t.user?.name}`,
      status: t.status,
      priority: t.priority,
      timestamp: t.createdAt,
      link: `/admin/support/${t._id}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  res.status(200).json({
    success: true,
    count: activities.length,
    activities,
  });
});

// =============================================
// @route   GET /api/admin/customers
// @access  Admin
// =============================================
const getAllCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const filter = { role: "customer" };
  if (req.query.isBlocked !== undefined) {
    filter.isBlocked = req.query.isBlocked === "true";
  }
  if (req.query.search) {
    const s = req.query.search.trim();
    filter.$or = [
      { name: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }

  const customers = await User.find(filter)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit)
    .select("-password -resetPasswordToken -resetPasswordExpire -refreshToken");

  const totalCount = await User.countDocuments(filter);

  // ---- Attach order summary for each customer ----
  const customerIds = customers.map((c) => c._id);
  const orderSummaries = await Order.aggregate([
    { $match: { user: { $in: customerIds } } },
    {
      $group: {
        _id: "$user",
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
  ]);

  const summaryMap = {};
  orderSummaries.forEach((s) => { summaryMap[s._id.toString()] = s; });

  const result = customers.map((c) => ({
    ...c.toJSON(),
    totalOrders: summaryMap[c._id.toString()]?.totalOrders || 0,
    totalSpent: summaryMap[c._id.toString()]?.totalSpent || 0,
  }));

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    customers: result,
  });
});

// =============================================
// @route   GET /api/admin/customers/:customerId
// @access  Admin
// =============================================
const getCustomerDetail = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.customerId)
    .select("-password -resetPasswordToken -resetPasswordExpire -refreshToken");

  if (!customer || customer.role !== "customer") {
    res.status(404);
    throw new Error("Customer not found.");
  }

  const [orders, reviews, tickets] = await Promise.all([
    Order.find({ user: customer._id })
      .sort("-createdAt")
      .limit(10)
      .select("orderNumber orderStatus totalAmount paymentMethod createdAt"),

    Review.find({ user: customer._id })
      .populate("product", "name slug")
      .sort("-createdAt")
      .limit(5)
      .select("rating title comment isApproved product createdAt"),

    SupportTicket.find({ user: customer._id })
      .sort("-createdAt")
      .limit(5)
      .select("ticketNumber subject status priority createdAt"),
  ]);

  const orderStats = await Order.aggregate([
    { $match: { user: customer._id } },
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
    customer,
    orderStats: orderStats[0] || { totalOrders: 0, totalSpent: 0 },
    recentOrders: orders,
    reviews,
    tickets,
  });
});

// =============================================
// @route   PUT /api/admin/customers/:customerId/block
// @access  Admin
// =============================================
const toggleBlockCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.customerId);
  if (!customer || customer.role !== "customer") {
    res.status(404);
    throw new Error("Customer not found.");
  }

  customer.isBlocked = !customer.isBlocked;
  await customer.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `Customer ${customer.isBlocked ? "blocked" : "unblocked"} successfully.`,
    isBlocked: customer.isBlocked,
  });
});

module.exports = {
  getDashboardStats,
  getRevenueChart,
  getTopProducts,
  getRecentActivity,
  getAllCustomers,
  getCustomerDetail,
  toggleBlockCustomer,
};
