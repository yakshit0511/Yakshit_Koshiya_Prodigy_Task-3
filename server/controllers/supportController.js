/**
 * controllers/supportController.js
 * -----------------------------------------
 * Customer support ticket system with threaded messaging:
 * Customer: Create, View, Reply, Close
 * Admin: List all, Update status, Reply with email notification
 * -----------------------------------------
 */

const SupportTicket = require("../models/SupportTicket");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendEmail } = require("../utils/sendEmail");

// =============================================
// ---- CUSTOMER ROUTES ----
// =============================================

// @route   POST /api/support/tickets
// @access  Private (Customer)
const createTicket = asyncHandler(async (req, res) => {
  const { subject, category, priority, message, relatedOrderId } = req.body;

  if (!subject || !category || !message) {
    res.status(400);
    throw new Error("subject, category and message are required.");
  }

  const validCategories = [
    "Order Issue", "Payment Issue", "Product Issue",
    "Delivery Issue", "Return Request", "General Inquiry",
  ];
  if (!validCategories.includes(category)) {
    res.status(400);
    throw new Error(`category must be one of: ${validCategories.join(", ")}`);
  }

  // ---- Handle file attachments ----
  const attachments = req.files
    ? req.files.map((f) => ({ url: f.path, publicId: f.filename, filename: f.originalname }))
    : [];

  const ticket = await SupportTicket.create({
    user: req.user._id,
    subject: subject.trim(),
    category,
    priority: priority || "Medium",
    relatedOrder: relatedOrderId || null,
    messages: [{
      sender: req.user._id,
      senderRole: "customer",
      message: message.trim(),
      attachments,
      sentAt: new Date(),
    }],
    status: "Open",
  });

  await ticket.populate("user", "name email");

  // ---- Send acknowledgment email ----
  sendEmail({
    to: req.user.email,
    template: "supportAcknowledgment",
    data: { user: { name: req.user.name }, ticket },
  }).catch((e) => console.error("Ticket acknowledgment email failed:", e.message));

  res.status(201).json({
    success: true,
    message: `Ticket #${ticket.ticketNumber} created. We will respond within 24 hours.`,
    ticket,
  });
});

// @route   GET /api/support/tickets
// @access  Private (Customer)
const getMyTickets = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const tickets = await SupportTicket.find(filter)
    .sort("-updatedAt")
    .select("-messages") // Don't send full thread in list view
    .populate("relatedOrder", "orderNumber orderStatus");

  res.status(200).json({
    success: true,
    count: tickets.length,
    tickets,
  });
});

// @route   GET /api/support/tickets/:ticketId
// @access  Private (Customer — own tickets only)
const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({
    _id: req.params.ticketId,
    user: req.user._id,
  })
    .populate("messages.sender", "name profilePhoto role")
    .populate("relatedOrder", "orderNumber orderStatus totalAmount");

  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }

  res.status(200).json({ success: true, ticket });
});

// @route   POST /api/support/tickets/:ticketId/reply
// @access  Private (Customer — own tickets)
const addReplyCustomer = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("message is required.");
  }

  const ticket = await SupportTicket.findOne({
    _id: req.params.ticketId,
    user: req.user._id,
  });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }
  if (ticket.status === "Closed") {
    res.status(400);
    throw new Error("Cannot reply to a closed ticket. Please create a new ticket.");
  }

  const attachments = req.files
    ? req.files.map((f) => ({ url: f.path, publicId: f.filename, filename: f.originalname }))
    : [];

  ticket.messages.push({
    sender: req.user._id,
    senderRole: "customer",
    message: message.trim(),
    attachments,
    sentAt: new Date(),
  });

  // Reopen if resolved
  if (ticket.status === "Resolved") ticket.status = "Open";
  await ticket.save();

  res.status(200).json({
    success: true,
    message: "Reply added.",
    ticket,
  });
});

// @route   PUT /api/support/tickets/:ticketId/close
// @access  Private (Customer)
const closeTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({
    _id: req.params.ticketId,
    user: req.user._id,
  });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }
  if (ticket.status === "Closed") {
    res.status(400);
    throw new Error("Ticket is already closed.");
  }

  ticket.status = "Closed";
  await ticket.save();

  res.status(200).json({
    success: true,
    message: "Ticket closed. Thank you for your feedback!",
    ticket,
  });
});

// @route   PUT /api/support/tickets/:ticketId/reopen
// @access  Private (Customer)
const reopenTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({
    _id: req.params.ticketId,
    user: req.user._id,
  });
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }
  if (ticket.status !== "Closed") {
    res.status(400);
    throw new Error("Ticket is not closed.");
  }

  ticket.status = "Open";
  await ticket.save();

  res.status(200).json({
    success: true,
    message: "Ticket reopened successfully.",
    ticket,
  });
});

// =============================================
// ---- ADMIN ROUTES ----
// =============================================

// @route   GET /api/admin/support/tickets
// @access  Admin
const getAllTicketsAdmin = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = parseInt(req.query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.category) filter.category = req.query.category;

  // Search by ticket number or customer name/email
  if (req.query.search) {
    const search = req.query.search.trim();
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");
    filter.$or = [
      { ticketNumber: { $regex: search, $options: "i" } },
      { user: { $in: matchingUsers.map((u) => u._id) } },
    ];
  }

  const [tickets, totalCount] = await Promise.all([
    SupportTicket.find(filter)
      .populate("user", "name email profilePhoto")
      .populate("relatedOrder", "orderNumber orderStatus")
      .sort("-updatedAt")
      .skip(skip)
      .limit(limit)
      .select("-messages"), // Full messages loaded in detail view
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

// @route   GET /api/admin/support/tickets/:ticketId
// @access  Admin
const getTicketByIdAdmin = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.ticketId)
    .populate("user", "name email phone profilePhoto")
    .populate("messages.sender", "name profilePhoto role")
    .populate("relatedOrder", "orderNumber orderStatus totalAmount createdAt");

  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }

  res.status(200).json({ success: true, ticket });
});

// @route   PUT /api/admin/support/tickets/:ticketId/status
// @access  Admin
const updateTicketStatus = asyncHandler(async (req, res) => {
  const { status, priority } = req.body;
  const updates = {};

  if (status) {
    const valid = ["Open", "In Progress", "Resolved", "Closed"];
    if (!valid.includes(status)) {
      res.status(400);
      throw new Error(`status must be one of: ${valid.join(", ")}`);
    }
    updates.status = status;
  }

  if (priority) {
    const validPriorities = ["Low", "Medium", "High", "Urgent"];
    if (!validPriorities.includes(priority)) {
      res.status(400);
      throw new Error(`priority must be one of: ${validPriorities.join(", ")}`);
    }
    updates.priority = priority;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400);
    throw new Error("Nothing to update. Provide status or priority.");
  }

  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.ticketId,
    updates,
    { new: true }
  ).populate("user", "name email");

  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }

  res.status(200).json({
    success: true,
    message: "Ticket updated successfully.",
    ticket,
  });
});


// @route   POST /api/admin/support/tickets/:ticketId/reply
// @access  Admin
const addReplyAdmin = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("message is required.");
  }

  const ticket = await SupportTicket.findById(req.params.ticketId)
    .populate("user", "name email");
  if (!ticket) {
    res.status(404);
    throw new Error("Ticket not found.");
  }
  if (ticket.status === "Closed") {
    res.status(400);
    throw new Error("Cannot reply to a closed ticket.");
  }

  const attachments = req.files
    ? req.files.map((f) => ({ url: f.path, publicId: f.filename, filename: f.originalname }))
    : [];

  ticket.messages.push({
    sender: req.user._id,
    senderRole: "admin",
    message: message.trim(),
    attachments,
    sentAt: new Date(),
  });
  ticket.status = "In Progress";
  await ticket.save();

  // ---- Email notification to customer ----
  if (ticket.user?.email) {
    sendEmail({
      to: ticket.user.email,
      template: "supportReply",
      data: {
        user: ticket.user,
        ticket,
        replyMessage: message.trim(),
      },
    }).catch((e) => console.error("Support reply email failed:", e.message));
  }

  res.status(200).json({
    success: true,
    message: "Admin reply sent.",
    ticket,
  });
});

module.exports = {
  createTicket,
  getMyTickets,
  getTicketById,
  addReplyCustomer,
  closeTicket,
  reopenTicket,
  getAllTicketsAdmin,
  getTicketByIdAdmin,
  updateTicketStatus,
  addReplyAdmin,
};
