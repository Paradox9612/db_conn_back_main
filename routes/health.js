// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

module.exports = router;
