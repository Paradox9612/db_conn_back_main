const mongoose = require("mongoose");

const InviteTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  token: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("InviteToken", InviteTokenSchema);
