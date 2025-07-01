const User = require("../models/user");
const PersonalInfo = require("../models/personalInfo");
const GradeAnalysis_URL = process.env.GradeAnalysis_URL;
const offerController = require("../controllers/offerController");

async function processCompletedOffers() {
  const users = await User.find({ status: "considering" }).select("email");
  if (!users.length) return;
  for (const { email } of users) {
    // 2. check for existing filter
    const exists = await Filter.exists({ email });
    if (exists) continue;

    // 3. no filter ⇒ run your custom execution
    console.log(`▶️ No filter for ${email}, running job…`);
    try {
      // ←— replace this with whatever you need
      const analyzeGrade = async () => {
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
            const filter = await offerController.processGradeAnalysisResponse(
              resp.data,
              email
            );
            console.log("Filter created:", filter);
          } else {
            console.log("Filter already exists or no grade report found.");
          }
        } catch (err) {
          console.error("Error in background grade analysis:", err);
        }
      };
      analyzeGrade();
      console.log(`✅ Job completed for ${email}`);
    } catch (err) {
      console.error(`❌ Job failed for ${email}:`, err);
    }
  }
}

module.exports = { processCompletedOffers };
