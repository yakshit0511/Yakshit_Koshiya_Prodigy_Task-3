/**
 * middleware/authMiddleware.js
 * -----------------------------------------
 * JWT Authentication middleware.
 * Protects routes by verifying the access token
 * from the Authorization header (Bearer scheme).
 * -----------------------------------------
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { asyncHandler } = require("./errorHandler");

/**
 * protect — Middleware that validates the JWT access token.
 * Attaches req.user on success, throws 401 on failure.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract Bearer token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized. No token provided.");
  }

  try {
    // Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user from DB (select fields we need; exclude password)
    const user = await User.findById(decoded.id).select(
      "-password -resetPasswordToken -resetPasswordExpire -refreshToken"
    );

    if (!user) {
      res.status(401);
      throw new Error("Not authorized. User no longer exists.");
    }

    // Prevent blocked users from accessing protected routes
    if (user.isBlocked) {
      res.status(403);
      throw new Error(
        "Your account has been blocked. Please contact support."
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      res.status(401);
      throw new Error("Not authorized. Invalid token.");
    }
    if (error.name === "TokenExpiredError") {
      res.status(401);
      throw new Error("Not authorized. Token has expired.");
    }
    throw error;
  }
});

/**
 * optionalAuth — Like protect, but doesn't fail if no token.
 * Useful for routes that behave differently when logged in
 * (e.g., showing wishlist status on product pages).
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch {
    req.user = null;
  }

  next();
});

module.exports = { protect, optionalAuth };
