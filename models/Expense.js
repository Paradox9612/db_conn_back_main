const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Journey', required: true },
  type: String,
  amount: { type: Number, required: true },
  billUrl: String,
  status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
