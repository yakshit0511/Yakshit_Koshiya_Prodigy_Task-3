/**
 * server.js
 * -----------------------------------------
 * Main Express application entry point.
 *
 * Setup order (important!):
 * 1. Load environment variables
 * 2. Connect to MongoDB
 * 3. Security middleware
 * 4. Body parsers & cookies
 * 5. API routes
 * 6. 404 handler
 * 7. Global error handler
 * 8. Start listening
 * 9. Graceful shutdown handler
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

// ---- 2. Database & Cloudinary config ----
const connectDB = require("./config/db");
require("./config/cloudinary"); // Initialize Cloudinary globally

// ---- 3. Route imports ----
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const couponRoutes = require("./routes/couponRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminRoutes = require("./routes/adminRoutes");

// ---- 4. Error handler utilities ----
const { notFound, errorHandler } = require("./middleware/errorHandler");

// ---- Create Express app ----
const app = express();
const PORT = process.env.PORT || 5000;

// =============================================
// CONNECT TO DATABASE
// =============================================
connectDB();

// =============================================
// SECURITY MIDDLEWARE
// =============================================

/**
 * Helmet — Sets security HTTP response headers.
 * Protects against well-known web vulnerabilities.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary images
  })
);

/**
 * CORS — Allow requests from the React frontend only.
 * Credentials true is needed for the httpOnly cookie (refresh token).
 */
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin '${origin}' not allowed.`));
      }
    },
    credentials: true, // Required for cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * Rate Limiting — Prevent brute-force and DoS attacks.
 * 100 requests per 15 minutes per IP.
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

/**
 * Stricter rate limit for authentication endpoints.
 * 10 requests per 15 minutes (prevents brute-force login).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many authentication attempts. Please wait 15 minutes.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

/**
 * Mongo Sanitize — Prevents NoSQL injection attacks.
 * Removes $ and . from query inputs.
 */
app.use(mongoSanitize());

/**
 * XSS Clean — Sanitizes user input to prevent XSS attacks.
 * Converts HTML entities in request body/query/params.
 */
app.use(xssClean());

/**
 * HPP (HTTP Parameter Pollution Prevention).
 * Prevents duplicate query parameters from causing issues.
 * Whitelist params that are intentionally arrays.
 */
app.use(
  hpp({
    whitelist: ["tags", "category", "brand"], // These can be arrays
  })
);

// =============================================
// BODY PARSERS & COOKIES
// =============================================

// Parse JSON bodies (limit 10mb for base64 images if needed)
app.use(express.json({ limit: "10mb" }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Parse cookies (needed for the httpOnly refresh token cookie)
app.use(cookieParser());

// =============================================
// STATIC FILES
// =============================================
// Serve uploaded files if using local storage (fallback)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =============================================
// API HEALTH CHECK
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
// API ROUTES — Mount all routers
// =============================================
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);

// =============================================
// 404 HANDLER — Catch unmatched routes
// Must be AFTER all valid routes
// =============================================
app.use(notFound);

// =============================================
// GLOBAL ERROR HANDLER
// Must be the LAST middleware (4 arguments)
// =============================================
app.use(errorHandler);

// =============================================
// START SERVER
// =============================================
const server = app.listen(PORT, () => {
  console.log(
    `\n🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
});

// =============================================
// GRACEFUL SHUTDOWN HANDLER
// =============================================
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log("✅ HTTP server closed.");

    // Close MongoDB connection
    const mongoose = require("mongoose");
    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB connection closed.");
      process.exit(0);
    });
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error("❌ Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit in development — useful for debugging
  if (process.env.NODE_ENV === "production") {
    server.close(() => process.exit(1));
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  process.exit(1);
});

module.exports = app;
