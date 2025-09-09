// controllers/dashboard.controller.js
const mongoose = require('mongoose');
const { Journey, Expense } = require('../models');

/**
 * Helper: returns a { start, end } Date range for supported period strings.
 * Supports: today, yesterday, this_week, last_7_days, last_30_days, this_month, last_month,
 *          this_year, custom (use query start & end ISO strings), or 'all' (null).
 */
function getPeriodRange(period, startStr, endStr) {
  const now = new Date();
  let start = null;
  let end = null;

  switch ((period || 'this_month').toLowerCase()) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday as start
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
    case 'last_7':
      start = new Date(now);
      start.setDate(now.getDate() - 6); // include today & last 6 days = 7 days
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
    case 'last_30':
      start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'custom':
      if (startStr) start = new Date(startStr);
      if (endStr) end = new Date(endStr);
      break;
    case 'all':
      start = null;
      end = null;
      break;
    default:
      // fallback to this_month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Helper: compute trend label 'up' | 'down' | 'equal' comparing current with previous value
 */
function computeTrend(currentVal = 0, previousVal = 0) {
  if (currentVal > previousVal) return 'up';
  if (currentVal < previousVal) return 'down';
  return 'equal';
}

/**
 * Helper: human-readable "time ago" string (simple)
 */
function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Main controller: returns dashboard metrics and recent activity for the authenticated user.
 * Query params:
 *   - period (string): presets like this_month, last_7_days, today, custom
 *   - start (ISO date string) - used if period=custom
 *   - end   (ISO date string) - used if period=custom
 *   - recentLimit (number) - how many recent items to return (default 10)
 */
const getUserDashboard = async (req, res) => {
  try {
    // Ensure authenticated user
    const user = req.user;
    if (!user || !user._id) return res.status(401).json({ message: 'Unauthorized' });
    const userId = mongoose.Types.ObjectId(user._id);

    // Parse query params
    const { period = 'this_month', start: startStr, end: endStr, recentLimit = 8 } = req.query;
    const { start, end } = getPeriodRange(period, startStr, endStr);

    // Build date match for queries (if start/end provided)
    const dateMatch = {};
    if (start) dateMatch.$gte = start;
    if (end) dateMatch.$lte = end;

    // ---------- Journeys metrics ----------
    // Count journeys in period
    const journeyFilter = { user: userId };
    if (start || end) journeyFilter.createdAt = dateMatch;

    const journeysCount = await Journey.countDocuments(journeyFilter);

    // Sum total distance (assumes Journey.distance is numeric)
    const distanceAgg = await Journey.aggregate([
      { $match: journeyFilter },
      { $group: { _id: null, totalDistance: { $sum: { $ifNull: ['$distance', 0] } } } }
    ]);
    const totalDistance = distanceAgg[0]?.totalDistance || 0;

    // Sum total hours spent (assumes Journey.duration stored in minutes)
    const durationAgg = await Journey.aggregate([
      { $match: journeyFilter },
      { $group: { _id: null, totalMinutes: { $sum: { $ifNull: ['$duration', 0] } } } }
    ]);
    const totalMinutes = durationAgg[0]?.totalMinutes || 0;
    const hoursSpent = Math.round((totalMinutes / 60) * 100) / 100; // round to 2 decimals

    // ---------- Expense / Expected amount metrics ----------
    // If journeys have expectedAmount field, sum it; otherwise sum Expense.amount
    let expectedAmount = 0;
    // Try journey expectedAmount
    const expectedAgg = await Journey.aggregate([
      { $match: journeyFilter },
      { $group: { _id: null, expectedTotal: { $sum: { $ifNull: ['$expectedAmount', 0] } } } }
    ]);
    expectedAmount = expectedAgg[0]?.expectedTotal || 0;

    // If expectedAmount is zero, fallback to Expense sum
    if (!expectedAmount) {
      const expenseFilter = { user: userId };
      if (start || end) expenseFilter.createdAt = dateMatch;

      const expenseAgg = await Expense.aggregate([
        { $match: expenseFilter },
        { $group: { _id: null, totalExpenses: { $sum: { $ifNull: ['$amount', 0] } } } }
      ]);
      expectedAmount = expenseAgg[0]?.totalExpenses || 0;
    }

    // ---------- Trends: compare with previous period ----------
    // Calculate previous period range (same length immediately before current start)
    let prevStart = null;
    let prevEnd = null;
    if (start && end) {
      const lengthMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - lengthMs);
    } else {
      // If no start/end (period='all'), we can't compute trend reliably
      prevStart = null;
      prevEnd = null;
    }

    // Helper to sum field for previous period
    const sumForPeriod = async (Model, matchUser, dateField = 'createdAt', sumField = '$amount') => {
      const match = { user: matchUser };
      if (prevStart && prevEnd) {
        match[dateField] = { $gte: prevStart, $lte: prevEnd };
      } else {
        // previous period not available -> return 0
        return 0;
      }
      const agg = await Model.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: sumField } } }
      ]);
      return agg[0]?.total || 0;
    };

    const prevExpectedAmount = await (async () => {
      // try journey.expectedAmount first
      if (prevStart && prevEnd) {
        const agg1 = await Journey.aggregate([
          {
            $match: {
              user: userId,
              createdAt: { $gte: prevStart, $lte: prevEnd }
            }
          },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$expectedAmount', 0] } } } }
        ]);
        const jVal = agg1[0]?.total || 0;
        if (jVal) return jVal;

        // fallback to expense sum
        const agg2 = await Expense.aggregate([
          {
            $match: {
              user: userId,
              createdAt: { $gte: prevStart, $lte: prevEnd }
            }
          },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }
        ]);
        return agg2[0]?.total || 0;
      }
      return 0;
    })();

    const prevDistance = (await Journey.aggregate([
      {
        $match: prevStart && prevEnd ? { user: userId, createdAt: { $gte: prevStart, $lte: prevEnd } } : { _id: null }
      },
      { $group: { _id: null, totalDistance: { $sum: { $ifNull: ['$distance', 0] } } } }
    ]))[0]?.totalDistance || 0;

    const prevDurationMinutes = (await Journey.aggregate([
      {
        $match: prevStart && prevEnd ? { user: userId, createdAt: { $gte: prevStart, $lte: prevEnd } } : { _id: null }
      },
      { $group: { _id: null, totalMinutes: { $sum: { $ifNull: ['$duration', 0] } } } }
    ]))[0]?.totalMinutes || 0;
    const prevHoursSpent = Math.round((prevDurationMinutes / 60) * 100) / 100;

    const prevJourneysCount = (await Journey.aggregate([
      {
        $match: prevStart && prevEnd ? { user: userId, createdAt: { $gte: prevStart, $lte: prevEnd } } : { _id: null }
      },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]))[0]?.count || 0;

    // ---------- Recent Activity ----------
    const recentLimitNum = Math.max(1, Math.min(50, parseInt(recentLimit || 8)));
    // We'll fetch latest expenses (if any) and map them as activity items
    const recentActivities = await Expense.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(recentLimitNum)
      .lean();

    const activityList = recentActivities.map((a) => ({
      type: 'expense',
      description: a.description || `Expense For Rs. ${a.amount}`,
      amount: a.amount,
      status: a.status || a.paymentStatus || 'pending',
      createdAt: a.createdAt,
      timeAgo: timeAgo(a.createdAt),
      journeyId: a.journey || a.journeyId || null
    }));

    // Build final response with trends
    const response = {
      success: true,
      data: {
        metrics: {
          expectedAmount: expectedAmount || 0,
          distance: totalDistance || 0,
          hoursSpent: hoursSpent || 0,
          journeys: journeysCount || 0
        },
        trends: {
          expectedAmount: computeTrend(expectedAmount, prevExpectedAmount),
          distance: computeTrend(totalDistance, prevDistance),
          hoursSpent: computeTrend(hoursSpent, prevHoursSpent),
          journeys: computeTrend(journeysCount, prevJourneysCount)
        },
        recentActivity: activityList
      },
      meta: {
        period: period,
        periodStart: start || null,
        periodEnd: end || null,
        previousPeriodStart: prevStart || null,
        previousPeriodEnd: prevEnd || null
      }
    };

    return res.json(response);
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUserDashboard };
