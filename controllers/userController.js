const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register (Only for candidates)
const registerUser = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (role === "admin")
      return res
        .status(403)
        .json({ message: "Admins cannot register via this route" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get User
const getUser = async (req, res) => {
  try {
    // Extract token from headers
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    // Fetch user from DB
    const user = await User.findById(decoded.id, { password: 0 });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send user data
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Update User Status
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "waiting",
      "requesting",
      "offering",
      "considering",
      "accepted",
      "rejected",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findOne({ email: req.body.email }, { password: 0 });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = status;
    await user.save();

    res.status(200).json({
      message: "User status updated successfully",
      status: user.status,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "candidate" }, { password: 0 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const getByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email }, { password: 0 });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUser,
  updateUserStatus,
  getAllUsers,
  getByEmail,
};
