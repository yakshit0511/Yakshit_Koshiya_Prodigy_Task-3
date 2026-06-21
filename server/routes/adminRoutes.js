/**
 * routes/adminRoutes.js
 * Mounted at: /api/admin
 * All routes require admin role.
 */

const express = require("express");
const router = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  getUserDetail,
  toggleBlockUser,
  changeUserRole,
  getRevenueChart,
} = require("../controllers/adminController");

const { protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

// All admin routes require both authentication and admin role
router.use(protect, isAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/revenue/chart", getRevenueChart);
router.get("/users", getAllUsers);
router.get("/users/:userId", getUserDetail);
router.put("/users/:userId/toggle-block", toggleBlockUser);
router.put("/users/:userId/role", changeUserRole);

module.exports = router;
