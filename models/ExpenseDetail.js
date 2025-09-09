const mongoose = require("mongoose");

const ExpenseDetailSchema = new mongoose.Schema({
  expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", required: true },
  description: { type: String },
  receiptUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("ExpenseDetail", ExpenseDetailSchema);
