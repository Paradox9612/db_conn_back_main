const mongoose = require("mongoose");

const RejectedExpenseSchema = new mongoose.Schema({
  expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", required: true },
  reason: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("RejectedExpense", RejectedExpenseSchema);
