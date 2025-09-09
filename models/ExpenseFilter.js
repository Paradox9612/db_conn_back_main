const mongoose = require("mongoose");

const ExpenseFilterSchema = new mongoose.Schema({
  filterName: { type: String, required: true },
  conditions: { type: Object, required: true },
}, { timestamps: true });

module.exports = mongoose.model("ExpenseFilter", ExpenseFilterSchema);
