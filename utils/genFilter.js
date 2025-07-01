// utils/genFilter.js
const axios = require("axios");
const FormData = require("form-data");

const User = require("../models/user");
const PersonalInfo = require("../models/personalInfo");
const Filter = require("../models/filter");
const GradeAnalysis_URL = process.env.GradeAnalysis_URL;

// bring in your grade‐response processor
const {
  processGradeAnalysisResponse,
} = require("../controllers/offerController");

// import S3 helpers
const { extractKey, getObjectStream } = require("../utils/s3Client");

async function processCompletedOffers() {
  // 1) fetch all users whose status is "considering"
  const users = await User.find({ status: "considering" }).select("email");
  if (!users.length) return;

  for (const { email } of users) {
    // 2) skip if a filter already exists
    if (await Filter.exists({ email })) continue;

    console.log(`▶️  No filter for ${email}, running job…`);

    try {
      const personalInfo = await PersonalInfo.findOne({ email });
      if (!personalInfo?.gradeReport) {
        console.log("No gradeReport found, skipping.");
        continue;
      }

      // 3) stream the report from S3
      const stream = await getObjectStream(personalInfo.gradeReport);

      // 4) build the multipart form
      const form = new FormData();
      form.append("file", stream, {
        // pull the raw key, then the filename
        filename: extractKey(personalInfo.gradeReport).split("/").pop(),
      });

      // 5) call your /analyze endpoint
      const resp = await axios.post(`${GradeAnalysis_URL}/analyze`, form, {
        headers: form.getHeaders(),
      });

      // 6) process the result & save the filter
      const filter = await processGradeAnalysisResponse(resp.data, email);
      console.log("Filter created:", filter);
    } catch (err) {
      console.error("Error in background grade analysis:", err);
    }

    console.log(`✅  Job completed for ${email}`);
  }
}

module.exports = { processCompletedOffers };
