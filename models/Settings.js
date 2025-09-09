const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  preferences: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model("Settings", SettingsSchema);
