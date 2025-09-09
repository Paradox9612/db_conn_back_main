const express = require('express');
const { register, login } = require('../controllers/auth.controller');

const router = express.Router();

// Forgot/reset password routes removed as requested
router.post('/register', register);
router.post('/login', login);

module.exports = router;
