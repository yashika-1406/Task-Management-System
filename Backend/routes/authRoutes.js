const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

/* ===========================
   REGISTER
=========================== */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "team_member",
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
});


/* ===========================
   LOGIN
=========================== */
router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // Compare password
    console.log("Email entered:", email);
console.log("Password entered:", password);
console.log("Stored password:", user.password);

const isMatch = await bcrypt.compare(password, user.password);

console.log("Password Match:", isMatch);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    // Create JWT — include role in token payload
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });

  }

});

/* ===========================
   SOCIAL LOGIN (SIMULATOR FOR OTHER PROVIDERS)
=========================== */
router.post("/social-login", async (req, res) => {
  try {
    const { email, name, provider, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10),
        role: "team_member",
        avatar: avatar || "",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   GOOGLE OAUTH LOGIN
=========================== */
router.post("/google-login", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        message: "Google OAuth credentials are not configured in backend .env file."
      });
    }

    const axios = require("axios");

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const { id_token } = tokenResponse.data;

    // Verify ID token with Google's tokeninfo endpoint
    const tokenInfoResponse = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${id_token}`
    );

    const { email, name, picture, email_verified } = tokenInfoResponse.data;

    if (!email_verified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Register new user from verified social auth
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10),
        role: "team_member",
        avatar: picture || "",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Google OAuth Error:", error.response?.data || error.message);
    res.status(500).json({
      message: error.response?.data?.error_description || "Google authentication failed"
    });
  }
});

/* ===========================
   FORGOT PASSWORD
=========================== */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    // Log to console for easy developer testing
    console.log(`\n=============================================`);
    console.log(`RESET PASSWORD LINK FOR ${email}:`);
    console.log(`http://localhost:5178/reset-password?token=${resetToken}`);
    console.log(`=============================================\n`);

    res.status(200).json({
      message: "Password reset link generated. Check console log.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   RESET PASSWORD
=========================== */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   CHANGE PASSWORD
=========================== */
router.post("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

/* ===========================
   UPDATE PROFILE
=========================== */
router.put("/update-profile", protect, async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email is already taken by another user." });
      }
      user.email = email.toLowerCase();
    }
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        avatar: user.avatar,
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;