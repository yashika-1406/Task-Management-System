const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* ===========================
   GET ALL USERS
=========================== */
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find({ _id: req.user._id }).select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   GET SINGLE USER
=========================== */
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   CREATE / INVITE USER
=========================== */
router.post("/", protect, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const finalName = name || email.split("@")[0];
    const finalPassword = password || "123456";
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const user = await User.create({
      name: finalName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "team_member",
    });

    // Simulate sending email invitation to developer console
    console.log(`\n=============================================`);
    console.log(`📧 EMAIL INVITATION SENT TO ${email.toLowerCase()}:`);
    console.log(`Subject: Added to TaskFlow Pro Workspace`);
    console.log(`Hello ${finalName},`);
    console.log(`You have been added to the workspace as a ${role || "team_member"}.`);
    console.log(`Temporary Password: ${finalPassword}`);
    console.log(`Login here: http://localhost:5173/`);
    console.log(`=============================================\n`);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   UPDATE USER
=========================== */
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email is already taken by another user." });
      }
      user.email = email.toLowerCase();
    }
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   DELETE USER
=========================== */
router.delete("/:id", protect, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   ACTIVATE / DEACTIVATE USER
=========================== */
router.patch("/:id/toggle-status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
