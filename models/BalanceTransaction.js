const mongoose = require("mongoose");

const BalanceTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["credit", "debit"], required: true },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("BalanceTransaction", BalanceTransactionSchema);
