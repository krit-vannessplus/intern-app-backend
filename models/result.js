const mongoose = require("mongoose");
const { Schema } = mongoose;

const ResultSchema = new Schema({
  email: { type: String, required: true, unique: true },
  result: { type: String, enum: ["accepted", "rejected"], default: "rejected" },
  positions: [{ type: String }],
});

module.exports = mongoose.model("Result", ResultSchema);
