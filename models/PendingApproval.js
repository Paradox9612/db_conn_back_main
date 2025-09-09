const mongoose = require("mongoose");

const PendingApprovalSchema = new mongoose.Schema({
  expense: { type: mongoose.Schema.Types.ObjectId, ref: "Expense", required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("PendingApproval", PendingApprovalSchema);
