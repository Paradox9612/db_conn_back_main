// routes/admin.routes.js
const express = require('express');
const { inviteUser, getInvites, deleteInvite } = require('../controllers/admin.controller');
const { authMiddleware, adminMiddleware } = require('../middelewares/auth');

const router = express.Router();

router.post('/invite', authMiddleware, adminMiddleware, inviteUser);
router.get('/invites', authMiddleware, adminMiddleware, getInvites);
router.delete('/invite/:token', authMiddleware, adminMiddleware, deleteInvite);

module.exports = router;
