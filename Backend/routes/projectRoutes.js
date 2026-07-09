const express = require("express");
const router = express.Router();

const {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  addMemberToProject,
  regenerateInviteCode,
  joinProjectByCode,
} = require("../controllers/projectController");

const { protect } = require("../middleware/authMiddleware");

// Join Project by Invite Code (registered before /:id)
router.post("/join", protect, joinProjectByCode);

// Create Project
router.post("/", protect, createProject);

// Get All Projects
router.get("/", protect, getProjects);
// Update Project
router.put("/:id", protect, updateProject);

// Delete Project
router.delete("/:id", protect, deleteProject);

// Add Member to Project by Email
router.post("/:id/members", protect, addMemberToProject);

// Regenerate Invite Code
router.post("/:id/regenerate-code", protect, regenerateInviteCode);

module.exports = router;