
const mongoose = require('mongoose');

const inviteTokenSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], required: true },
  token: { type: String, required: true },
  password: { type: String, required: true }, // hashed temp password
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('InviteToken', inviteTokenSchema);
