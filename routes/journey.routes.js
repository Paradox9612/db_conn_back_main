const express = require('express');
const {
  createJourney,
  listJourneys,
  getJourneyById,
  updateJourney,
  deleteJourney
} = require('../controllers/journey.controller');
const { authMiddleware } = require('../middelewares/auth');

const router = express.Router();

// Existing routes (unchanged)
router.post('/', authMiddleware, createJourney);
router.get('/', authMiddleware, listJourneys);

// New routes
router.get('/:id', authMiddleware, getJourneyById);     // Get journey by ID
router.put('/:id', authMiddleware, updateJourney);      // Update journey
router.delete('/:id', authMiddleware, deleteJourney);   // Delete journey

module.exports = router;
