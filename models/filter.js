const mongoose = require("mongoose");
const { Schema } = mongoose;

const FilterSchema = new Schema({
  gpaF: { type: Number, default: 0 }, // GPA from form
  gpaA: { type: Number, default: 0 }, // GPA from AI
  F: { type: Number, default: 0 },
  completeness: { type: Number, default: 0 },
  email: { type: String, required: true, unique: true },
  done: { type: Boolean, default: false }, // Indicates if the filter is done
});

module.exports = mongoose.model("Filter", FilterSchema);
