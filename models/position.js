const mongoose = require("mongoose");

const PositionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  availability: { type: Boolean, default: true },
});

module.exports = mongoose.model("Position", PositionSchema);
