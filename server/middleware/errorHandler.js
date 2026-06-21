/**
 * middleware/errorHandler.js
 * -----------------------------------------
 * Central error handling middleware.
 *
 * Handles:
 * - Mongoose CastError (invalid ObjectId)
 * - Mongoose ValidationError
 * - Mongoose Duplicate Key (code 11000)
 * - JWT errors (invalid / expired token)
 * - Multer file upload errors
 * - Generic / unhandled errors
 *
 * Hides stack traces in production.
 * -----------------------------------------
 */

/**
 * asyncHandler — Wraps async route handlers to catch promise rejections
 * and forward them to Express's next() error handler automatically.
 *
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * notFound — 404 handler for unmatched routes.
 * Must be registered BEFORE the errorHandler.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * errorHandler — Global error handling middleware.
 * Must be the LAST middleware registered in server.js.
 */
const errorHandler = (err, req, res, next) => {
  // Start with the status code already set on res, or default to 500
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";

  // ---- Mongoose: Invalid ObjectId ----
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = `Invalid ID format: ${err.value}`;
  }

  // ---- Mongoose: Validation Errors ----
  if (err.name === "ValidationError") {
    statusCode = 400;
    // Combine all validation messages into one readable string
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(". ");
  }

  // ---- MongoDB: Duplicate Key Error ----
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    const field = Object.keys(err.keyValue || {})[0];
    const value = err.keyValue ? err.keyValue[field] : "";
    message = field
      ? `'${value}' is already registered for field '${field}'. Please use a different value.`
      : "Duplicate value error. A record with this value already exists.";
  }

  // ---- JWT: Invalid Token ----
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token. Please log in again.";
  }

  // ---- JWT: Expired Token ----
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your session has expired. Please log in again.";
  }

  // ---- Multer: File upload errors ----
  if (err.name === "MulterError") {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  // ---- Build response object ----
  const response = {
    success: false,
    message,
  };

  // Include stack trace only in development (never in production)
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    response.errorName = err.name;
  }

  // Log all 500s to console for debugging
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${err.name}: ${err.message}`);
    if (process.env.NODE_ENV === "development") {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json(response);
};

module.exports = { asyncHandler, notFound, errorHandler };
