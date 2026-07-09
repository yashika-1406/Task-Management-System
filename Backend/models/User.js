const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    // Role-based access control
    role: {
      type: String,
      enum: ["admin", "project_manager", "team_member"],
      default: "team_member",
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Profile picture URL (optional)
    avatar: {
      type: String,
      default: "",
    },

    // For forgot password flow
    resetPasswordToken: {
      type: String,
    },

    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);