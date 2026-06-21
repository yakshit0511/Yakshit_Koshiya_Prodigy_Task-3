/**
 * routes/orderRoutes.js
 * Mounted at: /api/orders
 * Customer-facing order routes only.
 * Admin order routes are on /api/admin/orders.
 */

const express = require("express");
const router = express.Router();

const {
  placeOrder,
  verifyPayment,
  getMyOrders,
  getMyOrderById,
  cancelOrder,
  requestReturn,
  downloadInvoice,
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

// All order routes require authentication
router.use(protect);

router.post("/place", placeOrder);
router.post("/verify-payment", verifyPayment);
router.get("/my-orders", getMyOrders);
router.get("/my-orders/:orderId", getMyOrderById);
router.post("/:orderId/cancel", cancelOrder);
router.post("/:orderId/return-request", requestReturn);
router.get("/:orderId/invoice", downloadInvoice);

module.exports = router;
