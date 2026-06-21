/**
 * routes/adminRoutes.js
 * -----------------------------------------
 * Mounted at: /api/admin
 * All routes require protect + isAdmin middleware.
 *
 * Covers:
 *  - Dashboard stats, revenue chart, top products, activity
 *  - Customer management
 *  - Order management (list, view, update status, payment)
 *  - Review management (list all, approve/reject, reply)
 *  - Support ticket management (list, view, status, reply)
 * -----------------------------------------
 */

const express = require("express");
const router = express.Router();

// ---- Controller imports ----
const {
  getDashboardStats,
  getRevenueChart,
  getTopProducts,
  getRecentActivity,
  getAllCustomers,
  getCustomerDetail,
  toggleBlockCustomer,
} = require("../controllers/adminController");

const {
  getAllOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStats,
} = require("../controllers/orderController");

const {
  getAllReviewsAdmin,
  approveOrRejectReview,
  addAdminReply,
} = require("../controllers/reviewController");

const {
  getAllTicketsAdmin,
  getTicketByIdAdmin,
  updateTicketStatus,
  addReplyAdmin,
} = require("../controllers/supportController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const { uploadSupportAttachments } = require("../middleware/uploadMiddleware");

// ---- Apply auth + admin guard to ALL routes below ----
router.use(protect, isAdmin);

// =============================================
// DASHBOARD
// =============================================
router.get("/dashboard/stats", getDashboardStats);
router.get("/dashboard/revenue-chart", getRevenueChart);
router.get("/dashboard/top-products", getTopProducts);
router.get("/dashboard/recent-activity", getRecentActivity);

// =============================================
// CUSTOMER MANAGEMENT
// =============================================
router.get("/customers", getAllCustomers);
router.get("/customers/:customerId", getCustomerDetail);
router.put("/customers/:customerId/block", toggleBlockCustomer);

// =============================================
// ORDER MANAGEMENT
// =============================================
// IMPORTANT: /orders/stats must come BEFORE /orders/:orderId
// to prevent Express treating "stats" as an orderId
router.get("/orders/stats", getOrderStats);
router.get("/orders", getAllOrdersAdmin);
router.get("/orders/:orderId", getOrderByIdAdmin);
router.put("/orders/:orderId/status", updateOrderStatus);
router.put("/orders/:orderId/payment-status", updatePaymentStatus);

// =============================================
// REVIEW MANAGEMENT
// =============================================
router.get("/reviews", getAllReviewsAdmin);
router.put("/reviews/:reviewId/approve", approveOrRejectReview);
router.put("/reviews/:reviewId/reply", addAdminReply);

// =============================================
// SUPPORT TICKET MANAGEMENT
// =============================================
router.get("/support/tickets", getAllTicketsAdmin);
router.get("/support/tickets/:ticketId", getTicketByIdAdmin);
router.put("/support/tickets/:ticketId/status", updateTicketStatus);
router.post(
  "/support/tickets/:ticketId/reply",
  uploadSupportAttachments,
  addReplyAdmin
);

module.exports = router;
