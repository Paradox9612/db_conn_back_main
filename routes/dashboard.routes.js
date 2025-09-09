// routes/dashboard.routes.js
const express = require('express');
const { getUserDashboard } = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middelewares/auth');

const router = express.Router();

router.get('/', authMiddleware, getUserDashboard);

module.exports = router;
