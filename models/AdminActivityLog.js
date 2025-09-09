const mongoose = require("mongoose");

const AdminActivityLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  action: { type: String, required: true },
  details: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("AdminActivityLog", AdminActivityLogSchema);
