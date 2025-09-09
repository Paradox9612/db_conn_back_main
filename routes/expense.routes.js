const express = require('express');
const multer = require('multer'); // Import multer
const { authMiddleware } = require('../middelewares/auth');
const {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} = require('../controllers/expense.controller');

const router = express.Router();

// ---------------- Multer Setup ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts'); // folder must exist
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `receipt-${Date.now()}.${ext}`);
  }
});

const upload = multer({ storage }); // <-- this was missing

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

module.exports = router;
