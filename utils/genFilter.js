// services/offerService.js
const Offer = require("../models/offer");
const User = require("../models/user");
const PersonalInfo = require("../models/personalInfo");
const GradeAnalysis_URL = process.env.GradeAnalysis_URL;
const offerController = require("../controllers/offerController");

async function processCompletedOffers() {
  // Fetch all offers whose tests are all submitted
  const offers = await Offer.find({}).lean();
  for (const offer of offers) {
    if (!offer.skillTests.every((t) => t.status === "submitted")) continue;
    const user = await User.findOne({ email: offer.email });
    if (!user || user.status !== "offering") continue;

    // ←— your “do work” snippet
    console.log(`▶️ Running job for ${user.email}`);
    // e.g. await triggerGradeAnalysis(offer, user);
    // call grade report analysis
    const email = user.email;
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

          const resp = await axios.post(`${GradeAnalysis_URL}/analyze`, form, {
            headers: form.getHeaders(),
          });
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
    user.status = "considering";
    await user.save();
    console.log(`✅  ${user.email} bumped to 'considering'`);
  }
}

module.exports = { processCompletedOffers };
