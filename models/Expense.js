const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  journey: { type: mongoose.Schema.Types.ObjectId, ref: "Journey" },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Expense", ExpenseSchema);
