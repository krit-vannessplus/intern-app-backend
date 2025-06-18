const mongoose = require("mongoose");

const SkillTestSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  pdf: { type: String, required: true }, // Store PDF file URL or path
  position: { type: String, required: true },
});

const SkillTest = mongoose.model("SkillTest", SkillTestSchema);

module.exports = SkillTest;
