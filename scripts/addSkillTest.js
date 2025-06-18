const mongoose = require("mongoose");
const SkillTest = require("../models/skillTest");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const initialSkillTests = [
  {
    name: "Frontend Developer-1",
    pdf: "/uploads/Frontend Developer-1.pdf",
    position: "Frontend Developer",
  },
  {
    name: "Backend Developer-1",
    pdf: "/uploads/Backend Developer-1.pdf",
    position: "Backend Developer",
  },
  {
    name: "UI UX Designer-1",
    pdf: "/uploads/UI UX Designer-1.pdf",
    position: "UI UX Designer",
  },
];

const seedDatabase = async () => {
  try {
    await SkillTest.insertMany(initialSkillTests);
    console.log("Initial skill tests added successfully");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error inserting initial skill tests:", error);
    mongoose.disconnect();
  }
};

seedDatabase();
