const express = require("express");
const {
  createPosition,
  getAllPositions,
  updateAvailability,
} = require("../controllers/positionController");

const router = express.Router();

// Get all positions
router.get("/getAllPositions", getAllPositions);

// Create a new Position
router.post("/create", createPosition);

// Update Position Availability using the position's name
router.patch("/update/:name", updateAvailability);

module.exports = router;
