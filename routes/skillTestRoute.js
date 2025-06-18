const express = require("express");
// const multer = require("multer");
const {
  getSkillTestByName,
  getSkillTestByPosition,
  createSkillTest,
  deleteSkillTest,
  getAllSkillTests,
} = require("../controllers/skillTestController");

const router = express.Router();

// Configure Multer storage for SkillTest file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // Ensure the "uploads/skillTests" directory exists in your project
//     cb(null, "uploads/skillTests/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const upload = multer({ storage });
const makeUploader = require("../utils/s3Uploader");
const upload = makeUploader(() => "skillTests");

// Endpoint to get all SkillTests
router.get("/getAllSkillTests", getAllSkillTests);

// Endpoint to get a SkillTest by its name
router.get("/getByName/:name", getSkillTestByName);

// Endpoint to get all SkillTests for a given position
router.get("/getByPosition/:position", getSkillTestByPosition);

// Endpoint to create a new SkillTest with file upload.
// The file input should be sent as "pdf" in the form-data.
router.post("/create", upload.single("pdf"), createSkillTest);

// Endpoint to delete a SkillTest by its name
router.delete("/delete/:name", deleteSkillTest);

module.exports = router;
