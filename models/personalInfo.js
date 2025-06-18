const mongoose = require("mongoose");

const PersonalInfoSchema = new mongoose.Schema(
  {
    // Personal Information
    name: { type: String },
    nickname: { type: String },
    mobile: { type: String },
    address: { type: String },
    dob: { type: Date },
    bloodType: { type: String },
    lineId: { type: String },

    // Education Fields
    university: { type: String },
    qualification: { type: String },
    major: { type: String },
    gpa: { type: Number },

    // Additional Information
    reason: { type: String },
    otherReason: { type: String },
    strength: { type: String },
    weakness: { type: String },
    opportunity: { type: String },
    threats: { type: String },
    recruitmentSource: { type: String },

    // Email from the user status API
    email: { type: String, required: true, unique: true },

    dueTime: { type: Date, required: true },

    // File Upload Fields – these store the file paths
    videoClip: { type: String },
    gradeReport: { type: String },
    homeRegistration: { type: String },
    idCard: { type: String },
    slidePresentation: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PersonalInfo", PersonalInfoSchema);
