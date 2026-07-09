const Task = require("../models/Task");

/* ==========================
   CREATE TASK
========================== */
const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, project, assignedTo, progress } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      project,
      assignedTo: assignedTo || null,
      progress: progress || 0,
      createdBy: req.user._id,
    });

    // Populate for response
    await task.populate("assignedTo", "name email");
    await task.populate("project", "name");

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   GET ALL TASKS (filtered by project or assigned user)
========================== */
const getTasks = async (req, res) => {
  try {
    const { projectId, assignedTo, status } = req.query;

    // Build dynamic filter
    const filter = {};

    if (projectId) filter.project = projectId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (status) filter.status = status;

    // Team members only see their own tasks
    if (req.user.role === "team_member") {
      filter.assignedTo = req.user._id;
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email avatar")
      .populate("project", "name status")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   GET SINGLE TASK
========================== */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "name email avatar")
      .populate("project", "name status")
      .populate("createdBy", "name");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   UPDATE TASK
========================== */
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Team members can only update status and progress of their own tasks
    if (req.user.role === "team_member") {
      if (String(task.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized to edit this task" });
      }
      const { status, progress } = req.body;
      if (status) task.status = status;
      if (progress !== undefined) task.progress = progress;
    } else {
      // Managers and admins can update all fields
      const { title, description, status, priority, dueDate, assignedTo, progress } = req.body;
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo;
      if (progress !== undefined) task.progress = progress;
    }

    const updated = await task.save();
    await updated.populate("assignedTo", "name email");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ==========================
   DELETE TASK
========================== */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only admin or the project manager who created it can delete
    if (
      req.user.role !== "admin" &&
      String(task.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Not authorized to delete this task" });
    }

    await task.deleteOne();

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
