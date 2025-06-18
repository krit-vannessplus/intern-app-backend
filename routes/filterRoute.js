const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filterController");

// GET all filter with done: false
router.get("/getAllNotDone", filterController.getAllNotDone);

// PUT: set the done field for a specific email to true
router.put("/setDone/:email", filterController.setDone);

// DELETE: delete a filter entry by email
router.delete("/delete/:email", filterController.deleteFilter);

// GET all filter entries
router.get("/getAll", filterController.getAll);

// get filter by email
router.get("/getByEmail/:email", filterController.getFilterByEmail);
module.exports = router;
