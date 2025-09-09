const mongoose = require("mongoose");

const BulkApprovalSchema = new mongoose.Schema({
  expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Expense" }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  status: { type: String, enum: ["approved", "rejected"], required: true },
}, { timestamps: true });

module.exports = mongoose.model("BulkApproval", BulkApprovalSchema);
