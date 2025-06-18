// models/offer.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const SkillTestSchema = new Schema(
  {
    name: { type: String, required: true },
    uploadedFiles: [{ type: String }], // paths to uploaded files
    status: { type: String, enum: ["doing", "submitted"], default: "doing" },
    rank: { type: Number, default: 0 },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const OfferSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    dueTime: { type: Date, required: true },
    skillTests: [SkillTestSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
