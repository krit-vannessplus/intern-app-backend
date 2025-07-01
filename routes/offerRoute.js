const express = require("express");
const makeUploader = require("../utils/s3Uploader");
const offerController = require("../controllers/offerController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const updateUpload = makeUploader(
  (req, file) => `offers/${req.params.email}/${file.fieldname}`
  // { files: 10 }
);

// Create
router.post("/create", offerController.createOffer);

// Read
router.get("/getByEmail/:email", offerController.getOffer);

// Update (rank, explanation, dueTime, keepFiles, + new files)
router.patch(
  "/update/:email",
  updateUpload.any(),
  authMiddleware,
  offerController.updateOffer
);

// Submit one test
router.patch(
  "/submit/:email/:name",
  updateUpload.any(),
  authMiddleware,
  offerController.submitSkillTest
);

// Dismiss one test
router.patch(
  "/dismiss/:email/:name",
  authMiddleware,
  offerController.dismissSkillTest
);

module.exports = router;
