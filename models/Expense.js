const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    journey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Journey",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    receiptUrl: {
      type: String, // Cloudinary URL of the receipt
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
