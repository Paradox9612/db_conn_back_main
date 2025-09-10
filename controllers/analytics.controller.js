// controllers/analytics.controller.js
const Journey = require('../models/Journey');
const Expense = require('../models/Expense');
const { expectedFromDistance } = require('../utils/allowance');

// ================= USER DASHBOARD =================
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Current month range
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const journeys = await Journey.find({
      employeeId: userId,
      travelDate: { $gte: firstDay, $lte: lastDay }
    }).lean();

    const totalJourneys = journeys.length;
    const totalDistance = journeys.reduce((sum, j) => sum + (j.distance || 0), 0);
    const totalHours = journeys.reduce((sum, j) => sum + (j.hoursSpent || 0), 0);

    const expectedAmount = totalDistance ? expectedFromDistance(totalDistance) : 0;

    const journeyIds = journeys.map(j => j._id);
    const expenses = journeyIds.length
      ? await Expense.find({ journeyId: { $in: journeyIds } }).sort({ createdAt: -1 }).limit(5).lean()
      : [];

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
    console.error('getUserDashboard error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ================= ADMIN DASHBOARD =================
exports.getAdminDashboard = async (req, res) => {
  try {
    // totals across system
    const totalJourneys = await Journey.countDocuments();

    const totalExpensesAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const expenseTotal = totalExpensesAgg[0]?.total || 0;

    const pendingApprovals = await Expense.countDocuments({ status: 'pending' });

    res.json({
      totalJourneys,
      expenseTotal,
      pendingApprovals
    });
  } catch (err) {
    console.error('getAdminDashboard error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ================= WEEKLY ANALYTICS =================
// Replace existing getWeeklyAnalytics with this
exports.getWeeklyAnalytics = async (req, res) => {
  try {
    const now = new Date();
    // Start of the 7-day window (today and last 6 days)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Aggregate journeys grouped by dayOfWeek (named field)
    const journeysAgg = await Journey.aggregate([
      { $match: { travelDate: { $gte: weekStart, $lte: now } } },
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$travelDate' } },
          count: { $sum: 1 },
          distance: { $sum: { $ifNull: ['$distance', 0] } }
        }
      },
      { $sort: { '_id.dayOfWeek': 1 } }
    ]);

    // Aggregate expenses grouped by dayOfWeek
    const expensesAgg = await Expense.aggregate([
      { $match: { createdAt: { $gte: weekStart, $lte: now } } },
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$createdAt' } },
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.dayOfWeek': 1 } }
    ]);

    // MongoDB $dayOfWeek: 1 = Sunday, 2 = Monday, ... 7 = Saturday
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Map aggregates to quick lookup by day index (1..7)
    const journeysByDay = {};
    journeysAgg.forEach(item => {
      const idx = item._id.dayOfWeek;
      journeysByDay[idx] = { count: item.count || 0, distance: item.distance || 0 };
    });

    const expensesByDay = {};
    expensesAgg.forEach(item => {
      const idx = item._id.dayOfWeek;
      expensesByDay[idx] = { totalAmount: item.totalAmount || 0, count: item.count || 0 };
    });

    // Build ordered arrays for the last 7 days (keep Sunday..Saturday labels for charts)
    // To align with the 7-day window ending today, compute an ordered list of day indices.
    const orderedDayIndices = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(now);
      dt.setDate(now.getDate() - d);
      // compute dayOfWeek for this date (1..7)
      const dow = dt.getDay() === 0 ? 1 : dt.getDay() + 1; // careful: JS getDay(): 0=Sun..6=Sat; we want 1..7
      // Actually simpler: use Mongo's mapping: Sunday=1 => JS getDay() 0 -> 1; JS getDay()+1 gives 1..7
      // So:
      const mongoDow = dt.getDay() + 1;
      orderedDayIndices.push(mongoDow);
    }

    const labels = orderedDayIndices.map(i => dayNames[i - 1]);

    const journeysData = orderedDayIndices.map(i => {
      const v = journeysByDay[i] || { count: 0, distance: 0 };
      return { day: dayNames[i - 1], count: v.count, distance: v.distance };
    });

    const expensesData = orderedDayIndices.map(i => {
      const v = expensesByDay[i] || { totalAmount: 0, count: 0 };
      return { day: dayNames[i - 1], totalAmount: v.totalAmount, count: v.count };
    });

    // Return both raw aggregates and chart-friendly datasets
    res.json({
      labels,
      journeys: journeysData,
      expenses: expensesData,
      raw: { journeysAgg, expensesAgg }
    });
  } catch (err) {
    console.error('getWeeklyAnalytics error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Replace existing getMonthlyAnalytics with this
exports.getMonthlyAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    yearStart.setHours(0, 0, 0, 0);

    // Aggregate journeys by month number
    const journeysAgg = await Journey.aggregate([
      { $match: { travelDate: { $gte: yearStart, $lte: now } } },
      {
        $group: {
          _id: { month: { $month: '$travelDate' } },
          count: { $sum: 1 },
          distance: { $sum: { $ifNull: ['$distance', 0] } }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Aggregate expenses by month number
    const expensesAgg = await Expense.aggregate([
      { $match: { createdAt: { $gte: yearStart, $lte: now } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Map aggregates for quick lookup
    const journeysByMonth = {};
    journeysAgg.forEach(item => {
      const m = item._id.month;
      journeysByMonth[m] = { count: item.count || 0, distance: item.distance || 0 };
    });

    const expensesByMonth = {};
    expensesAgg.forEach(item => {
      const m = item._id.month;
      expensesByMonth[m] = { totalAmount: item.totalAmount || 0, count: item.count || 0 };
    });

    // Build arrays for months 1..currentMonth
    const currentMonthIndex = now.getMonth(); // 0-based
    const labels = monthNames.slice(0, currentMonthIndex + 1);

    const journeysData = [];
    const expensesData = [];
    for (let m = 1; m <= currentMonthIndex + 1; m++) {
      const j = journeysByMonth[m] || { count: 0, distance: 0 };
      const e = expensesByMonth[m] || { totalAmount: 0, count: 0 };
      journeysData.push({ month: monthNames[m - 1], count: j.count, distance: j.distance });
      expensesData.push({ month: monthNames[m - 1], totalAmount: e.totalAmount, count: e.count });
    }

    res.json({
      labels,
      journeys: journeysData,
      expenses: expensesData,
      raw: { journeysAgg, expensesAgg }
    });
  } catch (err) {
    console.error('getMonthlyAnalytics error:', err);
    res.status(500).json({ message: err.message });
  }
};

