const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Admin = require('../models/Admin');
const User = require('../models/User');
const InviteToken = require('../models/InviteToken'); // no {}

const signJwt = payload => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Login
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ message: 'email, password, role required' });

    let Model = role === 'superadmin' ? SuperAdmin : role === 'admin' ? Admin : User;
    const account = await Model.findOne({ email });
    if (!account) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, account.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    if (role !== 'superadmin' && !account.isRegistered) {
      return res.status(403).json({ message: 'Account not registered yet. Use token to complete registration.' });
    }

    const token = signJwt({ id: account._id, role });
    res.json({ token, role, email: account.email, name: account.name || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register with invite
exports.register = async (req, res) => {
  try {
    const { email, token, tempPassword, newPassword, name, role } = req.body;
    if (!email || !token || !tempPassword || !name || !role) {
      return res.status(400).json({ message: 'email, token, tempPassword, name, role required' });
    }

    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'role must be user or admin' });

    const invite = await InviteToken.findOne({ email, token, used: false });
    if (!invite) return res.status(400).json({ message: 'Invalid invite' });

    if (invite.expiresAt < new Date()) return res.status(400).json({ message: 'Invite expired' });

    const match = await bcrypt.compare(tempPassword, invite.password);
    if (!match) return res.status(400).json({ message: 'Invalid temporary password' });


    const Model = role === 'admin' ? Admin : User;
    let account = await Model.findOne({ email });

    if (!account) {
      account = new Model({
        email,
        password: await bcrypt.hash(newPassword, 10),
        name,
        isRegistered: true
      });
      await account.save();
    } else {
      account.password = await bcrypt.hash(newPassword, 10);
      account.name = name;
      account.isRegistered = true;
      await account.save();
    }

    invite.used = true;
    await invite.save();

    res.json({ message: 'Registration completed. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
