const { Expense, Journey } = require('../models');
const path = require('path');

const createExpense = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { amount, description, expenseType = 'Miscellaneous', journeyId } = req.body;
    if (amount == null) return res.status(400).json({ message: 'amount is required' });

    // Validate journey ownership
    if (journeyId) {
      const journey = await Journey.findById(journeyId);
      if (!journey) return res.status(400).json({ message: 'Journey not found' });
      if (String(journey.user) !== String(user._id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Journey does not belong to user' });
      }
    }

    // Handle uploaded file
    let receiptUrl = null;
    if (req.file) {
      receiptUrl = path.join('uploads/receipts', req.file.filename);
    }

    const expense = await Expense.create({
      user: user._id,
      journey: journeyId || null,
      amount,
      description,
      expenseType,
      receiptUrl,
      status: 'submitted',
    });

    return res.status(201).json({ success: true, expense });
  } catch (err) {
    console.error('Create Expense Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update expense to allow updating receipt
const updateExpense = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.receiptUrl = path.join('uploads/receipts', req.file.filename);
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updateData,
      { new: true }
    );

    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ success: true, expense });
  } catch (err) {
    console.error('Update Expense Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createExpense,
  listExpenses: async (req, res) => {
    try {
      const expenses = await Expense.find({ user: req.user._id }).sort({ createdAt: -1 });
      res.json({ success: true, expenses });
    } catch (err) {
      console.error('List Expenses Error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
  getExpenseById: async (req, res) => {
    try {
      const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
      if (!expense) return res.status(404).json({ message: 'Expense not found' });
      res.json({ success: true, expense });
    } catch (err) {
      console.error('Get Expense Error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
  updateExpense,
  deleteExpense: async (req, res) => {
    try {
      const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!expense) return res.status(404).json({ message: 'Expense not found' });
      res.json({ success: true, message: 'Expense deleted' });
    } catch (err) {
      console.error('Delete Expense Error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};
