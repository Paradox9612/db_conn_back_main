const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const InviteToken = require('../models/InviteToken');
const inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: 'Email and role required' });

    // Prevent duplicate invite if already exists & unused
    const existing = await InviteToken.findOne({ email, used: false });
    if (existing) return res.status(400).json({ message: 'Active invite exists for this email' });

    const token = crypto.randomBytes(20).toString('hex');
    const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const invite = await InviteToken.create({
      email,
      role,
      token,
      password: hashedPassword,
      expiresAt
    });

    res.status(201).json({
      success: true,
      message: 'Invite created',
      invite: {
        email,
        role,
        token,
        tempPassword,
        expiresAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getInvites = async (req, res) => {
  try {
    const invites = await InviteToken.find().sort({ createdAt: -1 });
    res.json({ success: true, invites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteInvite = async (req, res) => {
  try {
    const { token } = req.params;
    await InviteToken.findOneAndDelete({ token });
    res.json({ success: true, message: 'Invite deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { inviteUser, getInvites, deleteInvite };
