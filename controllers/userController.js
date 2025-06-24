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
  console.log("Login attempt with body:", req.body);
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
    console.log("User logged in:", user.email);
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

const registerAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: hashedPassword,
      role: "admin",
    });
    await newUser.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const registerAdmins = async (req, res) => {
  const { users } = req.body; // Expecting an array of user objects
  try {
    const existingUsers = await User.find({
      email: { $in: users.map((u) => u.email) },
    });
    if (existingUsers.length > 0)
      return res.status(400).json({ message: "Some emails already exist" });

    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
        role: "admin",
      }))
    );

    await User.insertMany(hashedUsers);
    res.status(201).json({ message: "Admins registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }, { password: 0 });
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteByEmail = async (req, res) => {
  const { email } = req.params;
  try {
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteAllAdmins = async (req, res) => {
  try {
    await User.deleteMany({ role: "admin" });
    res.status(200).json({ message: "All admins deleted successfully" });
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
  registerAdmin,
  registerAdmins,
  getAllAdmins,
  deleteByEmail,
  deleteAllAdmins,
};
