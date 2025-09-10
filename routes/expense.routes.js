const express = require('express');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middelewares/auth');
const {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getReceiptFile
} = require('../controllers/expense.controller');

const router = express.Router();

// ---------------- GridFS Setup ----------------
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseapp';

// Create storage engine for GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return {
      filename: `receipt-${Date.now()}-${file.originalname}`,
      bucketName: 'receipts' // collection in GridFS: fs.files → receipts.files
    };
  }
});

const upload = multer({ storage });

// ---------------- Routes ----------------
// Create expense with receipt upload
router.post('/', authMiddleware, upload.single('receipt'), createExpense);

// List all expenses
router.get('/', authMiddleware, listExpenses);

// Get expense by ID
router.get('/:id', authMiddleware, getExpenseById);

// Update expense with receipt upload
router.put('/:id', authMiddleware, upload.single('receipt'), updateExpense);

// Delete expense
router.delete('/:id', authMiddleware, deleteExpense);

// Get receipt by filename from GridFS
router.get('/receipt/:filename', getReceiptFile);

module.exports = router;
