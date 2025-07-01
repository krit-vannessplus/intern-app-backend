const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Load environment variables and required modules
require("dotenv").config();
const {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

// Import your models
const User = require("../models/user");
const Request = require("../models/request");
const PersonalInfo = require("../models/personalInfo");
const Offer = require("../models/offer");
const Filter = require("../models/filter");
const Result = require("../models/result");

// Initialize the S3 client and bucket name from environment variables
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

/* --------------------------- Helper Functions --------------------------- */

// Convert a full URL to an S3 object key
function keyFromUrl(urlStr = "") {
  try {
    const url = new URL(urlStr);
    // Remove the leading '/' and decode the string in case it contains spaces or encoded characters
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

// Delete a single S3 object given its URL
async function deleteFromS3ByUrl(url) {
  const key = keyFromUrl(url);
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    console.log("[s3] deleted", key);
  } catch (err) {
    if (err?.name !== "NoSuchKey") console.error("[s3] delete failed:", err);
  }
}

// Delete all objects in S3 that have keys starting with the given prefix (simulate folder deletion)
async function deleteFolderFromS3(prefix) {
  try {
    let continuationToken = undefined;
    do {
      const listParams = {
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      };
      const listResponse = await s3.send(new ListObjectsV2Command(listParams));
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deleteParams = {
          Bucket: BUCKET,
          Delete: {
            Objects: listResponse.Contents.map((item) => ({ Key: item.Key })),
          },
        };
        await s3.send(new DeleteObjectsCommand(deleteParams));
        console.log(`[s3] deleted objects with prefix ${prefix}`);
      }
      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : null;
    } while (continuationToken);
  } catch (err) {
    console.error(`[s3] failed to delete folder with prefix ${prefix}:`, err);
  }
}

/* --------------------------- Controller Function --------------------------- */

const deleteByEmail = async (req, res) => {
  const { email } = req.params;
  console.log("Deleting user with email:", email);
  try {
    // Delete the user from the Users collection
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // If the user is not an admin, delete their associated records and S3 files/folders
    if (user.role !== "admin") {
      // Delete a request record and its associated resume file (if present)
      const requestRecord = await Request.findOneAndDelete({ email });
      if (requestRecord && requestRecord.resume) {
        await deleteFromS3ByUrl(requestRecord.resume);
      }

      // Delete the personalInfo record and remove the folder from S3 (assuming folder prefix "personalInfo/<email>/")
      await PersonalInfo.findOneAndDelete({ email });
      await deleteFolderFromS3(`personalInfo/${email}/`);

      // Delete the offer record and its S3 folder (assuming folder prefix "offers/<email>/")
      await Offer.findOneAndDelete({ email });
      await deleteFolderFromS3(`offers/${email}/`);

      // Delete additional records (if needed)
      await Filter.findOneAndDelete({ email });
      await Result.findOneAndDelete({ email });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { deleteByEmail };

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
      { email: user.email, role: user.role },
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
    console.log("Fetching user with email:", decoded.email);
    const user = await User.findOne({ email: decoded.email }, { password: 0 });
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
  console.log("Registering admin with body:", req.body);
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
  console.log("Registering multiple admins with body:", req.body);
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
  console.log("Fetching all admins");
  try {
    const admins = await User.find({ role: "admin" }, { password: 0 });
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteAllAdmins = async (req, res) => {
  console.log("Deleting all admins");
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
