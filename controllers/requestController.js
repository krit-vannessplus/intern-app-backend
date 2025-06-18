/* controllers/requestController.js */
require("dotenv").config();
const Request = require("../models/request");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

/* --------------------------- helper ------------------------------------ */
function keyFromUrl(urlStr = "") {
  try {
    const url = new URL(urlStr);
    // pathname starts with “/”; decode in case the key had spaces
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return ""; // not a valid URL
  }
}

async function deleteFromS3ByUrl(url) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    console.log("[s3] deleted", key);
  } catch (err) {
    if (err?.name !== "NoSuchKey") console.error("[s3] delete failed:", err);
  }
}

/* --------------------------- CREATE ------------------------------------ */
const createRequest = async (req, res) => {
  try {
    const { positions, email } = req.body;

    const positionsArray = Array.isArray(positions)
      ? positions
      : String(positions || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);

    // multer-s3 gives us file.location (URL) + file.key
    const resumeUrl = req.file?.location;
    if (!resumeUrl)
      return res.status(400).json({ message: "Resume upload is required" });

    const newRequest = await Request.create({
      resume: resumeUrl, // ← store URL, not key
      positions: positionsArray,
      email,
    });

    res.status(201).json({ message: "Request created", request: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* --------------------------- UPDATE ------------------------------------ */
const updateRequestByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const { positions } = req.body;

    const positionsArray = Array.isArray(positions)
      ? positions
      : String(positions || "")
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);

    const existing = await Request.findOne({ email });
    if (!existing)
      return res.status(404).json({ message: "Request not found" });

    const update = { positions: positionsArray };

    if (req.file) {
      // remove old résumé (best-effort)
      await deleteFromS3ByUrl(existing.resume);

      update.resume = req.file.location; // new URL
    }

    const updated = await Request.findOneAndUpdate({ email }, update, {
      new: true,
    });

    res.json({ message: "Request updated", request: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* --------------------------- DELETE ------------------------------------ */
const deleteRequestByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const request = await Request.findOne({ email });
    if (!request) return res.status(404).json({ message: "Request not found" });

    await deleteFromS3ByUrl(request.resume); // tidy up file
    await Request.deleteOne({ email });

    res.json({ message: "Request deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

/* ----------------- the rest of the handlers stay unchanged ------------- */
/* ------------------------------------------------------------------ / /                    
GET  (GET /getRequest/:email)                   
/ / ------------------------------------------------------------------ */
const getRequestByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const request = await Request.findOne({ email });
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
/* ------------------------------------------------------------------ / /
LIST (GET /getAll)                             
/ / ------------------------------------------------------------------ */
const getAllRequests = async (_req, res) => {
  try {
    const emails = (
      await Request.find().sort({ createdAt: 1, updatedAt: 1 }).select("email")
    ).map((r) => r.email);
    res.json({ emails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const getNotOfferedRequests = async (_req, res) => {
  try {
    const emails = (
      await Request.find({ offered: false })
        .sort({ createdAt: 1, updatedAt: 1 })
        .select("email")
    ).map((r) => r.email);
    res.json({ emails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

const setOffereByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const request = await Request.findOneAndUpdate(
      { email },
      { offered: true },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: "Request not found" });

    res.json({ message: "Request marked as offered", request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createRequest,
  updateRequestByEmail,
  getRequestByEmail,
  getAllRequests,
  deleteRequestByEmail,
  getNotOfferedRequests,
  setOffereByEmail,
};
