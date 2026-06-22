/**
 * server.js
 * -----------------------------------------
 * Main Express application entry point.
 *
 * Setup order:
 * 1.  Load .env
 * 2.  Connect MongoDB + init Cloudinary
 * 3.  Security middleware (helmet, cors, rate-limit, sanitize)
 * 4.  Body parsers & cookie parser
 * 5.  Static file serving
 * 6.  Health check
 * 7.  API routes
 * 8.  404 handler
 * 9.  Global error handler
 * 10. Start HTTP server
 * 11. Graceful shutdown
 * -----------------------------------------
 */

// ---- 1. Load environment variables FIRST ----
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const path = require("path");
const compression = require("compression");
const { v4: uuidv4 } = require("uuid");
const morgan = require("morgan");

// ---- 2. Database & Cloudinary ----
const connectDB = require("./config/db");
const initIndexes = require("./config/indexes");
const logger = require("./utils/logger");
const { generateSitemapXml } = require("./utils/generateSitemap");
require("./config/cloudinary"); // Initialise Cloudinary v2 globally

// ---- Route imports ----
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const couponRoutes = require("./routes/couponRoutes");
const supportRoutes = require("./routes/supportRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const adminRoutes = require("./routes/adminRoutes");

// ---- Error handling utilities ----
const { notFound, errorHandler } = require("./middleware/errorHandler");

// =============================================
// BOOTSTRAP
// =============================================
const app = express();
const PORT = process.env.PORT || 5000;

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers["x-request-id"] || uuidv4();
  res.setHeader("x-request-id", req.requestId);
  next();
});

// Winston HTTP Logger Stream via Morgan
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - ReqID: :req[x-request-id]',
    { stream: logger.stream }
  )
);

// Compression middleware
app.use(compression());

// Connect to MongoDB Atlas
connectDB().then(() => {
  initIndexes();
});

// =============================================
// SECURITY MIDDLEWARE
// =============================================

/**
 * Helmet — Sets security HTTP headers.
 * Configured with contentSecurityPolicy for Cloudinary and Razorpay,
 * strict HSTS settings, and cross-origin controls.
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://checkout.razorpay.com"],
        frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/**
 * CORS — Only allow our React frontend.
 * credentials: true is required so the browser sends the
 * httpOnly refresh-token cookie on every request.
 */
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000", // CRA fallback
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman / mobile apps (no origin header) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" is not allowed.`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * RATE LIMITERS — Preventing abuse and securing API layers.
 */

// Global rate-limiter — 100 requests / 15 min / IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please wait 15 minutes and try again.",
  },
});
app.use("/api", globalLimiter);

// Strict rate-limiter for auth endpoints — 10 requests / 15 min / IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please wait 15 minutes.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

// Product endpoints rate-limiter — 200 requests / 15 min / IP
const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests to search/view products. Try again later.",
  },
});
app.use("/api/products", productLimiter);

// Cart & Order actions rate-limiter — 50 requests / 15 min / IP
const cartOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many checkout or cart updates. Please try again later.",
  },
});
app.use("/api/cart", cartOrderLimiter);
app.use("/api/orders", cartOrderLimiter);

// Admin dashboard and management rate-limiter — 150 requests / 15 min / IP
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many administrative requests. Try again later.",
  },
});
app.use("/api/admin", adminLimiter);

// Upload endpoints rate-limiter — 10 uploads / 15 min / IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many upload attempts. Try again later.",
  },
});
app.use("/api/auth/update-profile", uploadLimiter);

/**
 * Mongo Sanitize — Strip $ and . from user-supplied input.
 * Prevents NoSQL injection attacks.
 */
app.use(mongoSanitize());

/**
 * XSS Clean — Sanitize body/query/params to prevent
 * Cross-Site Scripting attacks by escaping HTML entities.
 */
app.use(xssClean());

/**
 * HPP (HTTP Parameter Pollution) — Whitelist array parameters.
 * Prevents attacks that use repeated query params to corrupt filters.
 */
app.use(
  hpp({
    whitelist: ["tags", "category", "brand", "sort", "fields"],
  })
);

// =============================================
// BODY PARSERS & COOKIE PARSER
// =============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// =============================================
// STATIC FILES (local fallback uploads)
// =============================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =============================================
// HEALTH CHECK — Quick ping to verify server is up
// =============================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 Local Store API is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// =============================================
// SITEMAP & FRONTEND LOGS ROUTE
// =============================================
app.get("/sitemap.xml", async (req, res) => {
  try {
    const sitemap = await generateSitemapXml(process.env.CLIENT_URL || "http://localhost:5173");
    res.header("Content-Type", "application/xml");
    res.status(200).send(sitemap);
  } catch (err) {
    logger.error("Failed to generate sitemap.xml:", err);
    res.status(500).end();
  }
});

app.post("/api/logs/frontend-error", (req, res) => {
  const { error, info, url, userAgent } = req.body;
  logger.error("Frontend Exception caught:", {
    error: error || "Unknown Error",
    info: info || "No info",
    url: url || "Unknown URL",
    userAgent: userAgent || "Unknown User Agent",
    requestId: req.requestId,
  });
  res.status(200).json({ success: true, message: "Error logged successfully" });
});

// =============================================
// API ROUTES
// =============================================

// ---- Public + Auth ----
app.use("/api/auth", authRoutes);           // Register, Login, Profile, Addresses
app.use("/api/products", productRoutes);    // Browse + Admin CRUD
app.use("/api/categories", categoryRoutes); // Browse + Admin CRUD

// ---- Authenticated Customer ----
app.use("/api/cart", cartRoutes);           // Cart operations + Coupon
app.use("/api/orders", orderRoutes);        // Place, My Orders, Cancel, Invoice
app.use("/api/reviews", reviewRoutes);      // Submit + Like reviews
app.use("/api/coupons", couponRoutes);      // Validate + Admin CRUD
app.use("/api/support", supportRoutes);     // Create + Reply + Close tickets
app.use("/api/wishlist", wishlistRoutes);   // Add / Remove / Move-to-Cart

// ---- Admin (all routes protected by isAdmin) ----
app.use("/api/admin", adminRoutes);         // Dashboard, Customers, Orders, Reviews, Tickets

// =============================================
// 404 NOT FOUND — Catch unmatched routes
// Must come AFTER all valid route declarations
// =============================================
app.use(notFound);

// =============================================
// GLOBAL ERROR HANDLER
// Must be the LAST middleware (4-argument signature)
// =============================================
app.use(errorHandler);

// =============================================
// START HTTP SERVER
// =============================================
const server = app.listen(PORT, () => {
  console.log(
    `\n🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
  );
  console.log(`📍 API Base:   http://localhost:${PORT}/api`);
  console.log(`❤️  Health:    http://localhost:${PORT}/api/health\n`);
});

// =============================================
// GRACEFUL SHUTDOWN
// Closes the HTTP server then MongoDB before exiting
// so in-flight requests and writes complete cleanly.
// =============================================
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received — shutting down gracefully...`);

  server.close(() => {
    console.log("✅ HTTP server closed.");

    const mongoose = require("mongoose");
    mongoose.connection.close(false).then(() => {
      console.log("✅ MongoDB connection closed.\n");
      process.exit(0);
    });
  });

  // Force-exit after 10 s if graceful shutdown stalls
  setTimeout(() => {
    console.error("❌ Forced exit after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ---- Handle unhandled rejections (e.g. DB query gone wrong) ----
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  if (process.env.NODE_ENV === "production") {
    server.close(() => process.exit(1));
  }
});

// ---- Handle uncaught synchronous errors ----
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  process.exit(1);
});

module.exports = app; // Exported for testing
