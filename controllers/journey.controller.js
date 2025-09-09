const { Journey } = require('../models');

// Create journey
const createJourney = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { purpose, startLocation, endLocation, distance, duration, expectedAmount } = req.body;
    if (!purpose || !startLocation || !endLocation || distance == null || duration == null) {
      return res.status(400).json({ message: 'purpose, startLocation, endLocation, distance, duration required' });
    }

    const journey = await Journey.create({
      user: user._id,
      purpose,
      startLocation,
      endLocation,
      distance,
      duration,
      expectedAmount: expectedAmount || 0
    });

    return res.status(201).json({ success: true, journey });
  } catch (err) {
    console.error('Create Journey Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List journeys
const listJourneys = async (req, res) => {
  try {
    const user = req.user;
    const journeys = await Journey.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, journeys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get journey by ID
const getJourneyById = async (req, res) => {
  try {
    const journey = await Journey.findOne({ _id: req.params.id, user: req.user._id });
    if (!journey) return res.status(404).json({ message: 'Journey not found' });
    res.json({ success: true, journey });
  } catch (err) {
    console.error('Get Journey Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update journey
const updateJourney = async (req, res) => {
  try {
    const journey = await Journey.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );
    if (!journey) return res.status(404).json({ message: 'Journey not found' });
    res.json({ success: true, journey });
  } catch (err) {
    console.error('Update Journey Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete journey
const deleteJourney = async (req, res) => {
  try {
    const journey = await Journey.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!journey) return res.status(404).json({ message: 'Journey not found' });
    res.json({ success: true, message: 'Journey deleted' });
  } catch (err) {
    console.error('Delete Journey Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createJourney, listJourneys, getJourneyById, updateJourney, deleteJourney };
