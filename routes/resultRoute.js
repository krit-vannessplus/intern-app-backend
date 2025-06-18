const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");

// Create a new result document
router.post("/create", resultController.createResult);

// Get a result document by email
router.get("/get/:email", resultController.getResultByEmail);

// Delete a result document by email
router.delete("/delete/:email", resultController.deleteResultByEmail);

module.exports = router;
