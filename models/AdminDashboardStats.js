const mongoose = require("mongoose");

const AdminDashboardStatsSchema = new mongoose.Schema({
  totalUsers: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  totalBalance: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("AdminDashboardStats", AdminDashboardStatsSchema);
