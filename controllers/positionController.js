const Position = require("../models/position");

// Create a new Position
const createPosition = async (req, res) => {
  try {
    const { name, availability = true } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const newPosition = new Position({ name, availability });
    await newPosition.save();

    res
      .status(201)
      .json({ message: "Position created", position: newPosition });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch all Positions
const getAllPositions = async (req, res) => {
  try {
    const positions = await Position.find({});
    res.status(200).json({ positions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Availability by Position Name
const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    const { name } = req.params; // Use the name from the URL parameter

    // Find the position using its name
    const position = await Position.findOne({ name });
    if (!position) {
      return res
        .status(404)
        .json({ error: `Position with name '${name}' not found` });
    }

    // Update and save availability
    position.availability = availability;
    await position.save();

    res.json({ message: "Availability updated", position });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createPosition, getAllPositions, updateAvailability };
