const express = require('express');
const router = express.Router();
const { upload } = require('../config/gridFs');
const { authMiddleware } = require('../middelewares/auth');
const { createExpense } = require('../controllers/expense.controller');

router.post('/', authMiddleware, upload.single('receipt'), createExpense);

module.exports = router;
