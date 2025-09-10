// controllers/admin.controller.js
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const Journey = require('../models/Journey');
const Expense = require('../models/Expense');
const InviteToken = require('../models/InviteToken');
const { expectedFromDistance } = require('../utils/allowance');

/**
 * Admin Overview (cards)
 */
exports.getAdminOverview = async (req, res) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Total expenses this month (sum)
    const expAgg = await Expense.aggregate([
      { $match: { createdAt: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalExpenses = expAgg[0]?.total || 0;
    const totalExpenseCount = expAgg[0]?.count || 0;

    // Total distance this month
    const jAgg = await Journey.aggregate([
      { $match: { travelDate: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: null, totalDistance: { $sum: '$distance' }, journeyCount: { $sum: 1 } } }
    ]);
    const totalDistance = jAgg[0]?.totalDistance || 0;
    const totalJourneyCount = jAgg[0]?.journeyCount || 0;

    // Efficiency Rate: percent of expense amount approved / total expense amount (month)
    const approvedAgg = await Expense.aggregate([
      { $match: { createdAt: { $gte: firstDay, $lte: lastDay }, status: 'approved' } },
      { $group: { _id: null, totalApproved: { $sum: '$amount' } } }
    ]);
    const totalApprovedAmount = approvedAgg[0]?.totalApproved || 0;
    const efficiencyRate = totalExpenses === 0 ? 0 : Math.round((totalApprovedAmount / totalExpenses) * 100);

    // Compliance Rate: percent of journeys that have at least one expense submitted
    const journeysWithExpenseAgg = await Expense.aggregate([
      { $match: { createdAt: { $gte: firstDay, $lte: lastDay } } },
      { $group: { _id: '$journeyId' } },
      { $count: 'uniqueJourneys' }
    ]);
    const journeysWithExpenses = journeysWithExpenseAgg[0]?.uniqueJourneys || 0;
    const complianceRate = totalJourneyCount === 0 ? 0 : Math.round((journeysWithExpenses / totalJourneyCount) * 100);

    // Recent activity (latest 6 expenses)
    const recentExpenses = await Expense.find().sort({ createdAt: -1 }).limit(6).lean();

    const recentActivity = recentExpenses.map(e => ({
      id: e._id,
      description: `${e.type || 'Expense'} For Rs. ${e.amount}`,
      createdAt: e.createdAt,
      status: e.status
    }));

    res.json({
      totalExpenses,
      totalDistance,
      efficiencyRate,
      complianceRate,
      recentActivity
    });
  } catch (err) {
    console.error('getAdminOverview error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get pending approvals (expenses)
 */
exports.getPendingApprovals = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const pending = await Expense.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('journeyId', 'employeeId source destination travelDate distance')
      .lean();

    res.json({ page, limit, items: pending });
  } catch (err) {
    console.error('getPendingApprovals error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Approve single resource (expense or journey)
 */
exports.approveSingle = async (req, res) => {
  try {
    const { type, id } = req.params;
    if (type === 'expense') {
      const exp = await Expense.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
      if (!exp) return res.status(404).json({ message: 'Expense not found' });
      return res.json({ message: 'Expense approved', expense: exp });
    } else if (type === 'journey') {
      const j = await Journey.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
      if (!j) return res.status(404).json({ message: 'Journey not found' });
      return res.json({ message: 'Journey approved', journey: j });
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
  } catch (err) {
    console.error('approveSingle error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reject single resource
 */
exports.rejectSingle = async (req, res) => {
  try {
    const { type, id } = req.params;
    if (type === 'expense') {
      const exp = await Expense.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
      if (!exp) return res.status(404).json({ message: 'Expense not found' });
      return res.json({ message: 'Expense rejected', expense: exp });
    } else if (type === 'journey') {
      const j = await Journey.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
      if (!j) return res.status(404).json({ message: 'Journey not found' });
      return res.json({ message: 'Journey rejected', journey: j });
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
  } catch (err) {
    console.error('rejectSingle error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Bulk approval endpoint (variance-based)
 * Body: { variancePercent: Number }
 */
exports.bulkApproveByVariance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const variancePercent = Number(req.body.variancePercent ?? 10); // default 10%
    if (isNaN(variancePercent)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'variancePercent must be a number' });
    }

    // find pending expenses
    const pendingExpenses = await Expense.find({ status: 'pending' }).populate('journeyId').session(session);

    const processed = [];
    let approvedCount = 0;
    let rejectedCount = 0;
    for (const exp of pendingExpenses) {
      const journey = exp.journeyId;
      const distance = (journey && journey.distance) ? journey.distance : 0;
      const expected = expectedFromDistance(distance);
      let variance = 0;
      if (expected === 0) {
        // If no expected (distance=0), set variance to a large value so admin threshold decides behavior
        variance = expected === 0 ? (exp.amount === 0 ? 0 : 100000) : 0;
      } else {
        variance = ((exp.amount - expected) / expected) * 100;
      }
      const within = Math.abs(variance) <= Math.abs(variancePercent);
      if (within) {
        exp.status = 'approved';
        await exp.save({ session });
        approvedCount++;
      } else {
        exp.status = 'rejected';
        await exp.save({ session });
        rejectedCount++;
      }
      processed.push({
        id: exp._id,
        journeyId: journey ? journey._id : null,
        amount: exp.amount,
        expected,
        variance: Number(variance.toFixed(2)),
        action: within ? 'approved' : 'rejected'
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: 'Bulk processed',
      approvedCount,
      rejectedCount,
      totalProcessed: processed.length,
      processed
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('bulkApproveByVariance error:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Invite user endpoints
 * - inviteUser (create InviteToken with temp password)
 * - getInvites (list)
 * - deleteInvite (delete by token)
 */
exports.inviteUser = async (req, res) => {
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
    console.error('inviteUser error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInvites = async (req, res) => {
  try {
    const invites = await InviteToken.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, invites });
  } catch (err) {
    console.error('getInvites error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const removed = await InviteToken.findOneAndDelete({ token });
    if (!removed) return res.status(404).json({ success: false, message: 'Invite not found' });
    res.json({ success: true, message: 'Invite deleted' });
  } catch (err) {
    console.error('deleteInvite error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
