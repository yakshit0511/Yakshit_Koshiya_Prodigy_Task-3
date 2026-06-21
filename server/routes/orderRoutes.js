/**
 * routes/orderRoutes.js
 * Mounted at: /api/orders
 */

const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

// All order routes require auth
router.use(protect);

// Customer routes
router.post("/place", placeOrder);
router.get("/my-orders", getMyOrders);

// Razorpay payment routes
router.post("/razorpay/create", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

// Admin routes (must come before /:id to avoid conflicts)
router.get("/admin/all", isAdmin, getAllOrdersAdmin);

// Routes with :id param
router.get("/:id", getOrderById);
router.put("/:id/status", isAdmin, updateOrderStatus);
router.put("/:id/cancel", cancelOrder);
router.put("/:id/return", requestReturn);
router.get("/:id/invoice", downloadInvoice);

module.exports = router;
