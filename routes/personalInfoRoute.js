// routes/personalInfoRoute.js
const express = require("express");
const router = express.Router();

const personalInfoController = require("../controllers/personalInfoController");
const makeUploader = require("../utils/s3Uploader");
const authMiddleware = require("../middleware/authMiddleware");

/* ——— keep the list in ONE place so routes & controller match ——— */
const UPLOAD_FIELDS = [
  "videoClip",
  "gradeReport",
  "homeRegistration",
  "idCard",
  "slidePresentation",
];

/**
 * makeUploader(cb)
 *   `cb` returns the S3 object key.
 *   We embed email → personalInfo/<email>/<fieldName>
 */
const upload = makeUploader((req, file) => {
  const email = req.params.email || req.body.email;
  if (!email) throw new Error("email is required");
  return `personalInfo/${email}/${file.fieldname}`;
});

/* --------------------------- routes --------------------------------- */
router.post("/create", personalInfoController.createPersonalInfo);
router.get("/getByEmail/:email", personalInfoController.getByEmail);

router.patch(
  "/submit/:email",
  upload.fields(UPLOAD_FIELDS.map((name) => ({ name, maxCount: 1 }))),
  authMiddleware,
  personalInfoController.submitPersonalInfo
);

router.delete(
  "/file/:email/:fieldName",
  personalInfoController.deleteUploadedFile
);

module.exports = router;
