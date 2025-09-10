const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: String,
  destination: String,
  travelDate: { type: Date, required: true },
  distance: { type: Number, default: 0 }, // km
  hoursSpent: { type: Number, default: 0 }, // hours
  expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],
  status: { type: String, enum: ['pending', 'approved', 'completed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Journey', journeySchema);
