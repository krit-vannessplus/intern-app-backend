const SkillTest = require("../models/skillTest");
const s3Client = require("../utils/s3Client");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

const getSkillTestByName = async (req, res) => {
  try {
    const { name } = req.params;
    const skillTest = await SkillTest.findOne({ name });
    if (!skillTest) {
      return res.status(404).json({ message: "Skill test not found" });
    }
    return res.status(200).json(skillTest);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getSkillTestByPosition = async (req, res) => {
  try {
    const { position } = req.params;
    const skillTests = await SkillTest.find({ position });
    if (!skillTests.length) {
      return res
        .status(404)
        .json({ message: "No skill tests found for this position" });
    }
    return res.status(200).json(skillTests);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const createSkillTest = async (req, res) => {
  try {
    const { name, position } = req.body;

    // 1. Validate file upload
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "File upload is required (field name: pdf)" });
    }

    // 2. Accept both disk or S3:
    const pdf = req.file.location || req.file.path; // location (S3) ‑or- path (disk)
    if (!pdf) {
      return res
        .status(500)
        .json({ message: "Unexpected upload error - no file URL returned" });
    }

    // 3. Basic field validation
    if (!name || !position) {
      return res
        .status(400)
        .json({ message: "Please provide name and position" });
    }

    // 4. Prevent duplicates
    const existing = await SkillTest.findOne({ name });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Skill test with this name already exists" });
    }

    // 5. Persist
    const newSkillTest = await SkillTest.create({ name, pdf, position });

    return res.status(201).json({
      message: "Skill test created successfully",
      skillTest: newSkillTest,
    });
  } catch (error) {
    console.error("createSkillTest error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const deleteSkillTest = async (req, res) => {
  try {
    const { name } = req.params;
    // 1️⃣ Pull the doc first so we still have its PDF URL
    const skillTest = await SkillTest.findOne({ name });
    if (!skillTest) {
      return res.status(404).json({ message: "Skill test not found" });
    }

    // 2️⃣ Delete file on S3 (best-effort)
    if (skillTest.pdf && skillTest.pdf.startsWith("http")) {
      try {
        const url = new URL(skillTest.pdf);
        // "/skillTests/1708000123456-resume.pdf"  ->  "skillTests/1708000123456-resume.pdf"
        const key = decodeURIComponent(url.pathname).replace(/^\/+/, "");

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
          })
        );
        console.log("S3 object deleted:", key);
      } catch (s3Err) {
        console.error("Failed to delete S3 object:", s3Err);
        /* don’t abort the request; just log it */
      }
    }

    // 3️⃣ Delete the document itself
    await SkillTest.deleteOne({ name: skillTest.name });

    return res.status(200).json({ message: "Skill test deleted successfully" });
  } catch (error) {
    console.error("deleteSkillTest error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getAllSkillTests = async (req, res) => {
  try {
    // Retrieve all skill tests from the database.
    const skillTests = await SkillTest.find();
    // console.log("Retrieved skill tests:", skillTests);
    return res.status(200).json({
      message: "Skill tests retrieved successfully",
      skillTests: skillTests,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getSkillTestByName,
  getSkillTestByPosition,
  createSkillTest,
  deleteSkillTest,
  getAllSkillTests,
};
