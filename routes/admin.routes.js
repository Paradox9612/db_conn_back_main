// routes/admin.js
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middelewares/auth");
const roleMiddleware = require("../middelewares/role");

const {
  inviteUser,
  getInvites,
  deleteInvite,
  getAdminOverview,
  getPendingApprovals,
  approveSingle,
  rejectSingle,
  bulkApproveByVariance,
} = require("../controllers/admin.controller");

// Protect all routes: only admin & superadmin
router.use(authMiddleware, roleMiddleware(["admin", "superadmin"]));

// =============== INVITE MANAGEMENT ===============
router.post("/invite", inviteUser);
router.get("/invites", getInvites);
router.delete("/invite/:token", deleteInvite);

// =============== ADMIN DASHBOARD ===============
router.get("/overview", getAdminOverview);

// =============== APPROVAL WORKFLOW ===============
router.get("/pending-approvals", getPendingApprovals);
router.post("/approve/:type/:id", approveSingle);
router.post("/reject/:type/:id", rejectSingle);

// Bulk approval by variance rule
router.post("/approve/bulk", bulkApproveByVariance);

module.exports = router;
