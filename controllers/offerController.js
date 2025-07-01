/**
 * controllers/offerController.js
 * Now stores file URLs in Offer.uploadedFiles and removes objects from S3
 * whenever they’re pruned or a skill test is dismissed.
 */

require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const Offer = require("../models/offer");
const Filter = require("../models/filter");
const PersonalInfo = require("../models/personalInfo");

const {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

/* ──────────────────────────  S3 helpers  ────────────────────────── */

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET_NAME;
const s3 = new S3Client({ region: REGION });
const S3_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

/* url ⇄ key conversions -------------------------------------------- */
function extractKey(pathOrUrl = "") {
  if (!pathOrUrl.startsWith("http")) return pathOrUrl.replace(/^\/+/, "");
  try {
    const { pathname } = new URL(pathOrUrl);
    return decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    // malformed URL? treat as raw key
    return pathOrUrl.replace(/^\/+/, "");
  }
}
const urlForKey = (key) => `${S3_BASE}/${encodeURIComponent(key)}`;

/* deletion ---------------------------------------------------------- */
async function deleteFromS3(pathOrUrl) {
  const Key = extractKey(pathOrUrl);
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
    console.log("[s3] deleted", Key);
  } catch (err) {
    if (err?.name !== "NoSuchKey")
      console.error("[s3] delete failed", Key, err);
  }
}

/* download stream --------------------------------------------------- */
async function getObjectStream(pathOrUrl) {
  const Key = extractKey(pathOrUrl);
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key }));
  return Body;
}

/* ──────────────────────────  CREATE  ─────────────────────────────── */

exports.createOffer = async (req, res) => {
  try {
    const { email, dueTime, skillTests } = req.body;
    if (!email || !dueTime || !Array.isArray(skillTests))
      return res.status(400).json({
        message: "Provide email, dueTime and an array of skillTests.",
      });

    const docs = skillTests.map((st) => ({
      name: st.name,
      uploadedFiles: [], // will hold URLs
      status: "doing",
      rank: Number(st.rank) || 0,
      explanation: st.explanation || "",
    }));

    const offer = await Offer.create({ email, dueTime, skillTests: docs });
    return res.status(201).json({ message: "Offer created", offer });
  } catch (err) {
    console.error("createOffer", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ──────────────────────────  READ  ───────────────────────────────── */

exports.getOffer = async (req, res) => {
  try {
    const offer = await Offer.findOne({ email: req.params.email });
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    return res.json({ offer });
  } catch (err) {
    console.error("getOffer", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ────────────────────────  UPDATE OFFER  ─────────────────────────── */

exports.updateOffer = async (req, res) => {
  try {
    const { email } = req.params;
    const offer = await Offer.findOne({ email });
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    /* 1. dueTime */
    if (req.body.dueTime) offer.dueTime = req.body.dueTime;

    /* 2. body.skillTests may arrive as JSON string */
    let updates = req.body.skillTests || [];
    if (typeof updates === "string") updates = JSON.parse(updates);

    /* 3. rank / explanation / prune */
    for (const { name, rank, explanation, keepFiles } of updates) {
      const st = offer.skillTests.find((t) => t.name === name);
      if (!st) continue;

      if (typeof rank === "number") st.rank = rank;
      if (typeof explanation === "string") st.explanation = explanation;

      if (Array.isArray(keepFiles)) {
        const toRemove = st.uploadedFiles.filter((u) => !keepFiles.includes(u));
        await Promise.all(toRemove.map(deleteFromS3));
        st.uploadedFiles = keepFiles.slice();
      }
    }

    /* 4. collect new uploads – Multer gives: key & location */
    const filesByTest = {};
    (req.files || []).forEach((f) => {
      const url = f.location || urlForKey(f.key);
      filesByTest[f.fieldname] = filesByTest[f.fieldname] || [];
      filesByTest[f.fieldname].push(url);
    });

    /* 5. enforce cap & push */
    for (const st of offer.skillTests) {
      const incoming = filesByTest[st.name] || [];
      if (st.uploadedFiles.length + incoming.length > 10)
        throw new Error(`Too many files for test "${st.name}" (max 10).`);
      st.uploadedFiles.push(...incoming);
    }

    /* ⬇️  Disable optimistic concurrency for THIS save only */
    await offer.save({ optimisticConcurrency: false });

    return res.json({ message: "Offer updated", offer });
  } catch (err) {
    console.error("updateOffer", err);
    return res.status(400).json({ error: err.message });
  }
};

/* ───────────────────────  SUBMIT SKILL TEST  ─────────────────────── */

const GradeAnalysis_URL = process.env.GradeAnalysis_URL;

exports.submitSkillTest = async (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.files:", req.files);
  console.log("req.params:", req.params);
  try {
    const { email, name } = req.params;
    const offer = await Offer.findOne({ email });
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const st = offer.skillTests.find((t) => t.name === name);
    if (!st) return res.status(404).json({ message: "Skill test not found" });

    /* keepFiles pruning */
    let keepFiles = req.body.keepFiles || [];
    if (typeof keepFiles === "string") keepFiles = JSON.parse(keepFiles);

    if (Array.isArray(keepFiles)) {
      const toRemove = st.uploadedFiles.filter((u) => !keepFiles.includes(u));
      await Promise.all(toRemove.map(deleteFromS3));
      st.uploadedFiles = keepFiles.slice();
    }

    /* new uploads */
    const newUrls = (req.files || []).map(
      (f) => f.location || urlForKey(f.key)
    );
    if (st.uploadedFiles.length + newUrls.length > 10)
      return res.status(400).json({ message: "max 10 files per test" });

    st.uploadedFiles.push(...newUrls);
    st.status = "submitted";

    const allSubmitted = offer.skillTests.every(
      (t) => t.status === "submitted"
    );

    /* trigger grade analysis only once all tests have been submitted.
       Launch the work in background without waiting for it. */
    if (allSubmitted) {
      console.log(
        "All skill tests submitted, starting background grade analysis..."
      );
      (async () => {
        try {
          const personalInfo = await PersonalInfo.findOne({ email });
          const filterExists = await Filter.exists({ email });

          if (!filterExists && personalInfo?.gradeReport) {
            const stream = await getObjectStream(personalInfo.gradeReport);
            const form = new FormData();
            form.append("file", stream, {
              filename: extractKey(personalInfo.gradeReport).split("/").pop(),
            });

            const resp = await axios.post(
              `${GradeAnalysis_URL}/analyze`,
              form,
              {
                headers: form.getHeaders(),
              }
            );
            const filter = await processGradeAnalysisResponse(resp.data, email);
            console.log("Filter created:", filter);
            // Update user status in the background
            try {
              userController.updateUserStatus({
                body: { status: "considering" },
              });
              console.log("User status updated to 'considering'.");
            } catch (error) {
              console.error("Error updating user status:", error);
            }
          } else {
            console.log("Filter already exists or no grade report found.");
          }
        } catch (err) {
          console.error("Error in background grade analysis:", err);
        }
        console.log("Background grade analysis completed.");
      })();
    }

    await offer.save();
    return res.json({ message: "Submitted", offer, allSubmitted });
  } catch (err) {
    console.error("submitSkillTest", err);
    return res.status(400).json({ error: err.message });
  }
};

/* ───────────────────────  DISMISS SKILL TEST  ────────────────────── */

exports.dismissSkillTest = async (req, res) => {
  try {
    const { email, name } = req.params;
    const offer = await Offer.findOne({ email });
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const idx = offer.skillTests.findIndex((t) => t.name === name);
    if (idx === -1)
      return res.status(404).json({ message: "Skill test not found" });

    /* delete every file belonging to that test */
    await Promise.all(
      (offer.skillTests[idx].uploadedFiles || []).map(deleteFromS3)
    );

    offer.skillTests.splice(idx, 1);
    await offer.save();

    return res.json({ message: "Skill test dismissed", offer });
  } catch (err) {
    console.error("dismissSkillTest", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/* ---- completeness helpers (unchanged) ----------------------------- */
/**
 * Calculates completeness percentage for a given personal information document.
 * Completeness is computed over a fixed set of fields as the percentage
 * of fields that are not null, undefined, or an empty string.
 *
 * @param {Object} personalInfoObj - The plain object from the PersonalInfo document.
 * @returns {number} - The completeness percentage.
 */
function calculateCompleteness(personalInfoObj) {
  // Specify the fields to consider, based on your PersonalInfo schema
  const fieldsToConsider = [
    "name",
    "nickname",
    "mobile",
    "address",
    "dob",
    "bloodType",
    "lineId",
    "university",
    "qualification",
    "major",
    "gpa",
    "reason",
    "otherReason",
    "strength",
    "weakness",
    "opportunity",
    "threats",
    "recruitmentSource",
    "email",
    "dueTime",
    "videoClip",
    "gradeReport",
    "homeRegistration",
    "idCard",
    "slidePresentation",
  ];

  const total = fieldsToConsider.length;
  const filled = fieldsToConsider.filter((field) => {
    const value = personalInfoObj[field];
    return value !== null && value !== undefined && value !== "";
  }).length;
  return (filled / total) * 100;
}

/**
 * Processes the response from the external grade analysis service.
 * It extracts the GPA and F values from the response content,
 * looks up the associated PersonalInfo by email, calculates completeness,
 * and creates a new Filter instance.
 *
 * @param {Object} apiResponse - The response object from the external service.
 * @param {string} email - The email to lookup the PersonalInfo.
 * @returns {Promise<Object>} - Returns the newly created Filter document.
 */
async function processGradeAnalysisResponse(apiResponse, email) {
  try {
    // Example API response structure:
    // {
    //   "content": "```json\n{\n  \"GPA\": 3.42,\n  \"F\": 0\n}\n```",
    //   "role": "assistant"
    // }

    // Remove markdown code fences to extract the inner JSON
    let content = apiResponse.content || "";
    content = content.replace(/```json\s*/, "").replace(/\s*```$/, "");

    // Parse the content into JSON
    const apiData = JSON.parse(content);

    // Retrieve the associated PersonalInfo document by email
    const personalInfo = await PersonalInfo.findOne({ email });
    if (!personalInfo) {
      throw new Error("PersonalInfo not found for email: " + email);
    }

    // Calculate the completeness percentage. We assume personalInfo is a Mongoose document.
    const personalInfoObj = personalInfo.toObject();
    const completeness = calculateCompleteness(personalInfoObj);

    // Prepare the filter data
    const filterData = {
      gpaF: personalInfo.gpa || 0, // GPA from the personal info form
      gpaA: apiData.GPA || 0, // GPA from the API response
      F: apiData.F || 0, // F from the API response
      completeness, // Computed completeness percentage
      email: personalInfo.email, // Email
    };

    // Create and save a new Filter instance
    const filter = new Filter(filterData);
    await filter.save();
    return filter;
  } catch (error) {
    console.error("Error processing grade analysis response:", error);
    throw error;
  }
}
