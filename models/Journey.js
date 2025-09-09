const mongoose = require("mongoose");

const JourneySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Journey", JourneySchema);
