const bcrypt = require('bcryptjs');
const { User, Admin, InviteToken } = require('../models');
const { generateToken } = require('../utils/token');

const register = async (req, res) => {
  try {
    const { name, email, password, token } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    const existingAdmin = await Admin.findOne({ email });

    if (existingUser || existingAdmin) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    let userRole = 'user';

    // If token provided, validate invite token
    if (token) {
      const invite = await InviteToken.findOne({
        token,
        email,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!invite) {
        return res.status(400).json({ success: false, message: 'Invalid or expired invite token' });
      }

      userRole = invite.role;

      // Mark invite as used
      invite.used = true;
      invite.usedAt = new Date();
      await invite.save();
    }

    // Create user based on role
    let newUser;
    if (userRole === 'admin') {
      newUser = await Admin.create({
        name,
        email,
        password,
        role: 'admin'
      });
    } else {
      newUser = await User.create({
        name,
        email,
        password,
        role: userRole
      });
    }

    const jwtToken = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: jwtToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user in both collections, include password explicitly
    let user = await Admin.findOne({ email }).select('+password');
    if (!user) {
      user = await User.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Bypass inactive check for super_admin
    if (user.role !== 'super_admin' && user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    // Compare password (works if pre-save hook hashes it)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        ...(user.role === 'user' && {
          currentBalance: user.currentBalance,
          amountClaimed: user.amountClaimed
        })
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Removed forgot password functionality as requested
module.exports = { register, login };
