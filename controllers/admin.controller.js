// controllers/admin.controller.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const InviteToken = require("../models/InviteToken");
const Expense = require("../models/Expense");
const Journey = require("../models/Journey");

// ================= INVITE MANAGEMENT =================

// Create invite
const inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role required" });
    }

    // Prevent duplicate active invite
    const existing = await InviteToken.findOne({ email, used: false });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Active invite already exists for this email" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const tempPassword = crypto.randomBytes(4).toString("hex"); // 8 chars
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const invite = await InviteToken.create({
      email,
      role,
      token,
      password: hashedPassword,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: "Invite created",
      invite: {
        email,
        role,
        token,
        tempPassword,
        expiresAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all invites
const getInvites = async (req, res) => {
  try {
    const invites = await InviteToken.find().sort({ createdAt: -1 });
    res.json({ success: true, invites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete invite
const deleteInvite = async (req, res) => {
  try {
    const { token } = req.params;
    await InviteToken.findOneAndDelete({ token });
    res.json({ success: true, message: "Invite deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= ADMIN OVERVIEW & APPROVALS =================

// Overview cards for admin dashboard
const getAdminOverview = async (req, res) => {
  try {
    const totalJourneys = await Journey.countDocuments();
    const totalExpensesAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const expenseTotal = totalExpensesAgg[0]?.total || 0;

    const pendingApprovals = await Expense.countDocuments({ status: "pending" });

    res.json({
      success: true,
      totalJourneys,
      expenseTotal,
      pendingApprovals,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// List pending approvals
const getPendingApprovals = async (req, res) => {
  try {
    const pending = await Expense.find({ status: "pending" })
      .populate("journeyId")
      .sort({ createdAt: -1 });
    res.json({ success: true, pending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve single expense/journey
const approveSingle = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type === "expense") {
      await Expense.findByIdAndUpdate(id, { status: "approved" });
    } else if (type === "journey") {
      await Journey.findByIdAndUpdate(id, { status: "approved" });
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    res.json({ success: true, message: `${type} approved` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject single expense/journey
const rejectSingle = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type === "expense") {
      await Expense.findByIdAndUpdate(id, { status: "rejected" });
    } else if (type === "journey") {
      await Journey.findByIdAndUpdate(id, { status: "rejected" });
    } else {
      return res.status(400).json({ message: "Invalid type" });
    }

    res.json({ success: true, message: `${type} rejected` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Bulk approve by variance rule
const bulkApproveByVariance = async (req, res) => {
  try {
    const { variance } = req.body;
    if (!variance) {
      return res.status(400).json({ message: "Variance required" });
    }

    // Example: approve all pending expenses within variance %
    const expenses = await Expense.find({ status: "pending" });
    const approved = [];

    for (let e of expenses) {
      // TODO: real variance logic here
      if (e.amount <= variance) {
        e.status = "approved";
        await e.save();
        approved.push(e._id);
      }
    }

    res.json({
      success: true,
      message: "Bulk approval complete",
      approvedCount: approved.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  inviteUser,
  getInvites,
  deleteInvite,
  getAdminOverview,
  getPendingApprovals,
  approveSingle,
  rejectSingle,
  bulkApproveByVariance,
};
