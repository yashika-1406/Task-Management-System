const Project = require("../models/Project");
const crypto = require("crypto");

const generateUniqueInviteCode = async () => {
  let isUnique = false;
  let code = "";
  while (!isUnique) {
    code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existing = await Project.findOne({ inviteCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

/* ==========================
   CREATE PROJECT
========================== */

const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      priority,
      startDate,
      endDate,
      progress,
      members,
    } = req.body;

    const inviteCode = await generateUniqueInviteCode();

    const project = await Project.create({
      name,
      description,
      status,
      priority,
      startDate,
      endDate,
      progress: progress || 0,
      members: members || [],
      owner: req.user._id,
      inviteCode,
    });

    await project.populate("owner", "name email");
    await project.populate("members", "name email role");

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/* ==========================
   GET ALL PROJECTS
========================== */

const getProjects = async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== "admin") {
      query.$or = [{ owner: req.user._id }, { members: req.user._id }];
    }
    const projects = await Project.find(query)
      .populate("owner", "name email")
      .populate("members", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== "admin" && req.user.role !== "project_manager") {
      query.owner = req.user._id;
    }
    const project = await Project.findOneAndUpdate(
      query,
      req.body,
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await project.populate("owner", "name email");
    await project.populate("members", "name email role");

    res.json(project);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== "admin" && req.user.role !== "project_manager") {
      query.owner = req.user._id;
    }
    const project = await Project.findOneAndDelete(query);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const addMemberToProject = async (req, res) => {
  try {
    const { email, role } = req.body;
    const { id } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const User = require("../models/User");
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Create a default name from email prefix
      const name = email.split("@")[0];
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("123456", 10);

      user = await User.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "team_member",
      });
    } else if (role && user.role !== role) {
      user.role = role;
      await user.save();
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Add to project members if not already there
    if (!project.members.includes(user._id)) {
      project.members.push(user._id);
      await project.save();
    }

    await project.populate("owner", "name email");
    await project.populate("members", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   REGENERATE INVITE CODE
========================== */
const regenerateInviteCode = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only project owner can regenerate the code
    if (String(project.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to regenerate invite code for this project" });
    }

    const newCode = await generateUniqueInviteCode();
    project.inviteCode = newCode;
    await project.save();

    res.status(200).json({ inviteCode: newCode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   JOIN PROJECT BY INVITE CODE
========================== */
const joinProjectByCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const project = await Project.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!project) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    // Prevent duplicate: check if user is owner or already a member
    const userIdStr = String(req.user._id);
    const isOwner = String(project.owner) === userIdStr;
    const isMember = project.members.some(memberId => String(memberId) === userIdStr);

    if (isOwner || isMember) {
      return res.status(400).json({ message: "You are already a member of this project" });
    }

    project.members.push(req.user._id);
    await project.save();

    await project.populate("owner", "name email");
    await project.populate("members", "name email role");

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
  addMemberToProject,
  regenerateInviteCode,
  joinProjectByCode,
};