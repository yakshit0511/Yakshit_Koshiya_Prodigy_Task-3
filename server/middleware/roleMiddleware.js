/**
 * middleware/roleMiddleware.js
 * -----------------------------------------
 * Role-Based Access Control (RBAC) middleware.
 * Used after the protect middleware to restrict
 * routes to specific roles (e.g., admin only).
 * -----------------------------------------
 */

/**
 * authorizeRoles — Factory that returns a middleware checking
 * if the authenticated user's role is in the allowed list.
 *
 * Usage:
 *   router.post('/admin-route', protect, authorizeRoles('admin'), handler)
 *   router.get('/staff-route', protect, authorizeRoles('admin', 'staff'), handler)
 *
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the protect middleware before this runs
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please log in.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not allowed to perform this action.`,
      });
    }

    next();
  };
};

/**
 * isAdmin — Shorthand middleware for admin-only routes.
 * Equivalent to authorizeRoles('admin').
 */
const isAdmin = authorizeRoles("admin");

/**
 * isSelfOrAdmin — Allows access if user is admin OR if the
 * resource belongs to the requesting user.
 * Expects req.params.userId or req.params.id to be the resource owner.
 */
const isSelfOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.params.id;

  const isSelf =
    req.user &&
    resourceUserId &&
    req.user._id.toString() === resourceUserId.toString();

  const isAdminUser = req.user && req.user.role === "admin";

  if (!isSelf && !isAdminUser) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only access your own resources.",
    });
  }

  next();
};

module.exports = { authorizeRoles, isAdmin, isSelfOrAdmin };
