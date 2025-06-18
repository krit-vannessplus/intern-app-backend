const Filter = require("../models/filter");

// 1. GET /getAllNotDone : return all filter that "done" field is false
exports.getAllNotDone = async (req, res) => {
  try {
    const filters = await Filter.find({ done: false });
    return res.json(filters);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 2. PUT /setDone/:email : set "done" field to true by its email
exports.setDone = async (req, res) => {
  try {
    const { email } = req.params;
    console.log(email);
    const updatedFilter = await Filter.findOneAndUpdate(
      { email },
      { done: true },
      { new: true }
    );
    console.log(email, updatedFilter);

    if (!updatedFilter) {
      return res.status(404).json({ error: "Filter not found" });
    }
    return res.json(updatedFilter);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 3. DELETE /delete/:email : delete filter by email
exports.deleteFilter = async (req, res) => {
  try {
    const { email } = req.params;
    const deletedFilter = await Filter.findOneAndDelete({ email });

    if (!deletedFilter) {
      return res.status(404).json({ error: "Filter not found" });
    }
    return res.json({ message: "Filter deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 4. GET /getAll : return all filters
exports.getAll = async (req, res) => {
  try {
    const filters = await Filter.find({});
    return res.json(filters);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 5. GET /getByEmail/:email : get filter by email
exports.getFilterByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const filter = await Filter.findOne({ email });
    if (!filter) {
      return res.status(404).json({ error: "Filter not found" });
    }
    return res.json(filter);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
