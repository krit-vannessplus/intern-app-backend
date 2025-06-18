const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    resume: {
      type: String,
      required: true,
    },
    positions: {
      type: [String],
      required: true,
    },
    email: { type: String, required: true, unique: true },
    offered: {
      type: Boolean,
      default: false, // Indicates if the user has been offered a position
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("Request", RequestSchema);
