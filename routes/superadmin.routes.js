const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middelewares/auth');
const { inviteUser, getInvites, deleteInvite } = require('../controllers/admin.controller');

const router = express.Router();

// Only superadmins/admins can invite users
router.post('/create-member', authMiddleware, adminMiddleware, inviteUser);
router.get('/invites', authMiddleware, adminMiddleware, getInvites);
router.delete('/invite/:token', authMiddleware, adminMiddleware, deleteInvite);

module.exports = router;
