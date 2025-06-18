// controllers/personalInfoController.js
// S3-based implementation. Stores PUBLIC URLs, but can
// still delete using either a key or a URL.

require("dotenv").config();
const PersonalInfo = require("../models/personalInfo");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

/* ---------- S3 config ---------------------------------------------- */
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

/* ---------- canonical upload fields -------------------------------- */
const UPLOAD_FIELDS = [
  "videoClip",
  "gradeReport",
  "homeRegistration",
  "idCard",
  "slidePresentation",
];

/* ---------- helpers ------------------------------------------------- */
/**
 * Accepts either:
 *   • raw key  → "personalInfo/user@x.com/idCard"
 *   • full URL → "https://bucket.s3.amazonaws.com/personalInfo/..."
 * Extracts the key (if needed) and deletes the object.
 * Silently ignores missing keys.
 */
async function deleteFromS3(keyOrUrl = "") {
  if (!keyOrUrl) return;

  let key = keyOrUrl;
  if (keyOrUrl.startsWith("http")) {
    try {
      const url = new URL(keyOrUrl);
      // "/personalInfo/..." -> "personalInfo/..."
      key = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    } catch (err) {
      console.error("[s3] URL parse failed:", keyOrUrl, err);
      return; // don’t attempt deletion with a malformed URL
    }
  }

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    console.log("[s3] deleted", key);
  } catch (err) {
    if (err?.name !== "NoSuchKey")
      console.error("[s3] delete failed", key, err);
  }
}

/* ------------------------------------------------------------------ */
/*                        POST  /create                               */
/* ------------------------------------------------------------------ */
exports.createPersonalInfo = async (req, res) => {
  try {
    const { email, dueTime } = req.body;
    if (!email || !dueTime)
      return res
        .status(400)
        .json({ message: "email and dueTime are required" });

    const doc = await PersonalInfo.create({
      email,
      dueTime: new Date(dueTime),
    });

    res.status(201).json({ message: "created", personalInfo: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ------------------------------------------------------------------ */
/*                      GET  /getByEmail/:email                       */
/* ------------------------------------------------------------------ */
exports.getByEmail = async (req, res) => {
  try {
    const doc = await PersonalInfo.findOne({ email: req.params.email });
    if (!doc) return res.status(404).json({ message: "not found" });

    res.json({ personalInfo: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ------------------------------------------------------------------ */
/*                       PATCH /submit/:email                         */
/* ------------------------------------------------------------------ */
exports.submitPersonalInfo = async (req, res) => {
  try {
    const { email } = req.params;
    const doc = await PersonalInfo.findOne({ email });
    if (!doc) return res.status(404).json({ message: "not found" });

    /* 1) scalar fields ------------------------------------------- */
    Object.assign(doc, req.body);

    /* 2) uploaded files ------------------------------------------ */
    // multer-s3 format: req.files = { fieldName: [fileObj] }
    if (req.files) {
      for (const [field, [file]] of Object.entries(req.files)) {
        if (!UPLOAD_FIELDS.includes(field)) continue;

        /* remove previous file (key OR url) --------------------- */
        if (doc[field]) await deleteFromS3(doc[field]);

        /* store PUBLIC URL so the front-end can load directly --- */
        doc[field] = file.location; // supplied by multer-s3
      }
    }

    await doc.save();
    res.json({ message: "submitted", personalInfo: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ------------------------------------------------------------------ */
/*                DELETE /file/:email/:fieldName                      */
/* ------------------------------------------------------------------ */
exports.deleteUploadedFile = async (req, res) => {
  const { email, fieldName } = req.params;

  if (!UPLOAD_FIELDS.includes(fieldName))
    return res.status(400).json({
      message: `fieldName must be one of: ${UPLOAD_FIELDS.join(", ")}`,
    });

  try {
    const doc = await PersonalInfo.findOne({ email });
    if (!doc) return res.status(404).json({ message: "not found" });

    if (!doc[fieldName])
      return res.status(404).json({ message: "no file for this field" });

    await deleteFromS3(doc[fieldName]);

    doc[fieldName] = ""; // clear URL in Mongo
    await doc.save();

    res.json({ message: "file deleted & field cleared", personalInfo: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
