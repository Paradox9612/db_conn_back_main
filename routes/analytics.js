const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middelewares/auth');
const {
  getUserDashboard,
  getAdminDashboard,
  getWeeklyAnalytics,
  getMonthlyAnalytics
} = require('../controllers/analytics.controller');

// User dashboard
router.get('/user', authMiddleware, getUserDashboard);

// Admin dashboard
router.get('/admin', authMiddleware, getAdminDashboard);

// Reports
router.get('/weekly', authMiddleware, getWeeklyAnalytics);
router.get('/monthly', authMiddleware, getMonthlyAnalytics);

module.exports = router;
