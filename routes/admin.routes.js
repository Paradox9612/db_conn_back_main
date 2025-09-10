// routes/admin.js
const express = require('express');
const router = express.Router();

// Use your auth middleware which exports authMiddleware and adminMiddleware
const { authMiddleware, adminMiddleware } = require('../middelewares/auth');

const {
  getAdminOverview,
  getPendingApprovals,
  approveSingle,
  rejectSingle,
  bulkApproveByVariance,
  inviteUser,
  getInvites,
  deleteInvite
} = require('../controllers/admin.controller');

// Protect all admin routes
router.use(authMiddleware, adminMiddleware);

// Admin overview (cards)
router.get('/overview', getAdminOverview);

// Pending approvals (expenses)
router.get('/pending-approvals', getPendingApprovals);

// Bulk approval by variance (keep before single approve route)
router.post('/approve/bulk', bulkApproveByVariance);

// Single approve / reject (expense or journey)
router.post('/approve/:type/:id', approveSingle);
router.post('/reject/:type/:id', rejectSingle);

// Invite management
router.post('/invite', inviteUser);
router.get('/invites', getInvites);
router.delete('/invite/:token', deleteInvite);

module.exports = router;
