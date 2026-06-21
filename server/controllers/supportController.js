/**
 * controllers/supportController.js
 * -----------------------------------------
 * Customer support ticket system:
 * - Create ticket, add reply, close ticket
 * - Admin: view all tickets, update status
 * - File attachment support
 * -----------------------------------------
 */

const SupportTicket = require("../models/SupportTicket");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendEmail } = require("../utils/sendEmail");
const User = require("../models/User");

// =============================================
// @route   GET /api/support/my-tickets
// @access  Private
// =============================================
const getMyTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [tickets, totalCount] = await Promise.all([
    SupportTicket.find(filter)
      .sort("-updatedAt")
      .skip(skip)
      .limit(limit)
      .select("-messages"), // Don't include all messages in list view
    SupportTicket.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    tickets,
  });
});

// =============================================
// @route   GET /api/support/:ticketId
// @access  Private (owner or admin)
// =============================================
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId)
    .populate("user", "name email")
    .populate("messages.sender", "name profilePhoto role")
    .populate("relatedOrder", "orderNumber orderStatus");

  if (!ticket) {
    res.status(404);
    throw new Error("Support ticket not found.");
  }

  const isOwner = ticket.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied.");
  }

  res.status(200).json({ success: true, ticket });
});

// =============================================
// @route   POST /api/support/create
// @access  Private
// =============================================
const createTicket = asyncHandler(async (req, res) => {
  const { subject, category, priority, message, relatedOrderId } = req.body;

  if (!subject || !category || !message) {
    res.status(400);
    throw new Error("Subject, category and message are required.");
  }

  // ---- Handle file attachments ----
  const attachments = req.files
    ? req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        filename: file.originalname,
      }))
    : [];

  const ticket = await SupportTicket.create({
    user: req.user._id,
    subject,
    category,
    priority: priority || "Medium",
    relatedOrder: relatedOrderId || null,
    messages: [
      {
        sender: req.user._id,
        senderRole: req.user.role,
        message,
        attachments,
        sentAt: new Date(),
      },
    ],
  });

  await ticket.populate("user", "name email");

  res.status(201).json({
    success: true,
    message: `Support ticket #${ticket.ticketNumber} created. We'll respond within 24 hours.`,
    ticket,
  });
});

// =============================================
// @route   POST /api/support/:ticketId/reply
// @access  Private (owner or admin)
// =============================================
const addReply = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("Message text is required.");
  }

  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) {
    res.status(404);
    throw new Error("Support ticket not found.");
  }

  const isOwner = ticket.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied.");
  }

  if (ticket.status === "Closed") {
    res.status(400);
    throw new Error("Cannot reply to a closed ticket. Please create a new ticket.");
  }

  // ---- Handle attachments ----
  const attachments = req.files
    ? req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        filename: file.originalname,
      }))
    : [];

  ticket.messages.push({
    sender: req.user._id,
    senderRole: req.user.role,
    message,
    attachments,
    sentAt: new Date(),
  });

  // ---- Update status ----
  if (req.user.role === "admin") {
    ticket.status = "In Progress";
  }

  await ticket.save();

  // ---- Send email notification to customer if admin replied ----
  if (req.user.role === "admin") {
    const customer = await User.findById(ticket.user);
    if (customer) {
      sendEmail({
        to: customer.email,
        template: "supportReply",
        data: { user: customer, ticket, replyMessage: message },
      }).catch((err) => console.error("Support reply email failed:", err.message));
    }
  }

  res.status(200).json({
    success: true,
    message: "Reply added.",
    ticket,
  });
});

// =============================================
// @route   PUT /api/support/:ticketId/status
// @access  Admin
// =============================================
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["Open", "In Progress", "Resolved", "Closed"];

  if (!status || !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${validStatuses.join(", ")}`);
  }

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.ticketId,
    { status },
    { new: true }
  ).populate("user", "name email");

  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }

  res.status(200).json({
    success: true,
    message: `Ticket status updated to '${status}'.`,
    ticket,
  });
});

// =============================================
// @route   GET /api/support/admin/all
// @access  Admin
// =============================================
const getAllTicketsAdmin = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.category) filter.category = req.query.category;

  const [tickets, totalCount] = await Promise.all([
    SupportTicket.find(filter)
      .populate("user", "name email")
      .sort("-updatedAt")
      .skip(skip)
      .limit(limit)
      .select("-messages"),
    SupportTicket.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    tickets,
  });
});

// =============================================
// @route   PUT /api/support/:ticketId/close
// @access  Private (owner can close their own)
// =============================================
const closeTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId);
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }

  const isOwner = ticket.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied.");
  }

  ticket.status = "Closed";
  await ticket.save();

  res.status(200).json({
    success: true,
    message: "Ticket closed.",
    ticket,
  });
});

module.exports = {
  getMyTickets,
  getTicketById,
  createTicket,
  addReply,
  updateTicketStatus,
  getAllTicketsAdmin,
  closeTicket,
};
