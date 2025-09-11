const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middelewares/auth");
const upload = require("../utils/Upload");

const {
  uploadExpenseReceipt,
  getExpense,
  updateExpense,
  deleteExpense,
} = require("../controllers/expense.controller");

// Create expense with receipt
router.post("/", authMiddleware, upload.single("receipt"), uploadExpenseReceipt);

// Get all expenses
router.get("/", authMiddleware, getExpense);

// Update expense
router.put("/:id", authMiddleware, upload.single("receipt"), updateExpense);

// Delete expense
router.delete("/:id", authMiddleware, deleteExpense);

module.exports = router;
