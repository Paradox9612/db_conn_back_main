// controllers/analytics.controller.js
const Journey = require('../models/Journey');
const Expense = require('../models/Expense');

// ================= USER DASHBOARD =================
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Current month range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const journeys = await Journey.find({
      employeeId: userId,
      travelDate: { $gte: firstDay, $lte: lastDay }
    });

    const totalJourneys = journeys.length;
    const totalDistance = journeys.reduce((sum, j) => sum + (j.distance || 0), 0);
    const totalHours = journeys.reduce((sum, j) => sum + (j.hoursSpent || 0), 0);

    // Business rule: Rs. 2/km allowance
    const ratePerKm = 2;
    const expectedAmount = totalDistance * ratePerKm;

    const journeyIds = journeys.map(j => j._id);
    const expenses = await Expense.find({ journeyId: { $in: journeyIds } })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentActivity = expenses.map(e => ({
      id: e._id,
      description: `Expense For Rs. ${e.amount}`,
      createdAt: e.createdAt,
      status: e.status
    }));

    res.json({
      expectedAmount,
      totalDistance,
      totalHours,
      totalJourneys,
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= ADMIN DASHBOARD =================
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalJourneys = await Journey.countDocuments();
    const totalExpenses = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const expenseTotal = totalExpenses[0]?.total || 0;

    const pendingApprovals = await Expense.countDocuments({ status: "pending" });

    res.json({
      totalJourneys,
      expenseTotal,
      pendingApprovals
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= WEEKLY ANALYTICS =================
exports.getWeeklyAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const journeys = await Journey.aggregate([
      {
        $match: { travelDate: { $gte: weekStart, $lte: now } }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$travelDate" },
          count: { $sum: 1 },
          distance: { $sum: "$distance" }
        }
      }
    ]);

    const expenses = await Expense.aggregate([
      {
        $match: { createdAt: { $gte: weekStart, $lte: now } }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    res.json({ journeys, expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= MONTHLY ANALYTICS =================
exports.getMonthlyAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const journeys = await Journey.aggregate([
      {
        $match: { travelDate: { $gte: yearStart, $lte: now } }
      },
      {
        $group: {
          _id: { $month: "$travelDate" },
          count: { $sum: 1 },
          distance: { $sum: "$distance" }
        }
      }
    ]);

    const expenses = await Expense.aggregate([
      {
        $match: { createdAt: { $gte: yearStart, $lte: now } }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    res.json({ journeys, expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
