const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ["candidate", "admin"],
    default: "candidate",
  },
  status: {
    type: String,
    enum: [
      "waiting",
      "requesting",
      "offering",
      "considering",
      "accepted",
      "rejected",
    ],
    default: "waiting",
  },
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
