/**
 * routes/supportRoutes.js
 * Mounted at: /api/support
 */

const express = require("express");
const router = express.Router();

const {
  getMyTickets,
  getTicketById,
  createTicket,
  addReply,
  updateTicketStatus,
  getAllTicketsAdmin,
  closeTicket,
} = require("../controllers/supportController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");
const { uploadSupportAttachments } = require("../middleware/uploadMiddleware");

// All support routes require auth
router.use(protect);

// Admin: all tickets
router.get("/admin/all", isAdmin, getAllTicketsAdmin);
router.put("/:ticketId/status", isAdmin, updateTicketStatus);

// Customer
router.get("/my-tickets", getMyTickets);
router.post("/create", uploadSupportAttachments, createTicket);

// Both customer and admin (access controlled inside controller)
router.get("/:ticketId", getTicketById);
router.post("/:ticketId/reply", uploadSupportAttachments, addReply);
router.put("/:ticketId/close", closeTicket);

module.exports = router;
