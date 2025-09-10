// routes/analytics.js
const express = require('express');
const router = express.Router();

// adjust path if your middleware file lives elsewhere (middelewares/auth.js)
const { authMiddleware, adminMiddleware, roleMiddleware } = require('../middelewares/auth');

const {
  getUserDashboard,
  getAdminDashboard,
  getWeeklyAnalytics,
  getMonthlyAnalytics
} = require('../controllers/analytics.controller');

// User dashboard - authenticated users
router.get('/user', authMiddleware, getUserDashboard);

// Admin dashboard - admin only
router.get('/admin', authMiddleware, adminMiddleware, getAdminDashboard);

// Weekly analytics - admin only (7-day window, chart-friendly output)
router.get('/weekly', authMiddleware, adminMiddleware, getWeeklyAnalytics);

// Monthly analytics - admin only (year-to-date months)
router.get('/monthly', authMiddleware, adminMiddleware, getMonthlyAnalytics);

module.exports = router;
