const Result = require("../models/result");

// 1. POST /create : Create a new result document
exports.createResult = async (req, res) => {
  try {
    const { email, result, positions } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Create a new result with provided values; fallback to defaults if not provided.
    const newResult = new Result({
      email,
      result: result || "rejected",
      positions: positions || [],
    });

    const savedResult = await newResult.save();
    return res.status(201).json(savedResult);
  } catch (err) {
    // Handle duplicate email error
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "Result with this email already exists" });
    }
    return res.status(500).json({ error: err.message });
  }
};

// 2. GET /get/:email : Get a result document by email
exports.getResultByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const resultDoc = await Result.findOne({ email });
    if (!resultDoc) {
      return res.status(404).json({ error: "Result not found" });
    }
    return res.json(resultDoc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 3. DELETE /delete/:email : Delete a result document by email
exports.deleteResultByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const deleted = await Result.findOneAndDelete({ email });
    if (!deleted) {
      return res.status(404).json({ error: "Result not found" });
    }
    return res.json({ message: "Result deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
