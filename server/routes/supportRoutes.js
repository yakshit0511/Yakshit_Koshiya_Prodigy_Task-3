/**
 * routes/supportRoutes.js
 * Mounted at: /api/support
 * Customer-facing support routes only.
 * Admin support routes are in adminRoutes.js
 */

const express = require("express");
const router = express.Router();

const {
  createTicket,
  getMyTickets,
  getTicketById,
  addReplyCustomer,
  closeTicket,
} = require("../controllers/supportController");

const { protect } = require("../middleware/authMiddleware");
const { uploadSupportAttachments } = require("../middleware/uploadMiddleware");

// All support routes require authentication
router.use(protect);

router.post("/tickets", uploadSupportAttachments, createTicket);
router.get("/tickets", getMyTickets);
router.get("/tickets/:ticketId", getTicketById);
router.post("/tickets/:ticketId/reply", uploadSupportAttachments, addReplyCustomer);
router.put("/tickets/:ticketId/close", closeTicket);

module.exports = router;
