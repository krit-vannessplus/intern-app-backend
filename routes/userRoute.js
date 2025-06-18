const express = require("express");
const {
  registerUser,
  loginUser,
  getUser,
  updateUserStatus,
  getAllUsers,
  getByEmail,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/user", authMiddleware, getUser);
router.patch("/status", updateUserStatus);
router.get("/getAll", getAllUsers);
router.get("/getByEmail/:email", getByEmail);

/* ───── NEW: verify token ───── */
router.get("/verify-token", authMiddleware, (req, res) => {
  // if we’re here, authMiddleware already validated the JWT
  res.status(200).json({
    valid: true,
    user: req.user, // { id, role, iat, exp }
  });
});

module.exports = router;
