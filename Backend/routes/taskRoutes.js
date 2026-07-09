const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const { protect, authorize } = require("../middleware/authMiddleware");

// GET all tasks (all roles — filtered by role in controller)
router.get("/", protect, getTasks);

// GET single task
router.get("/:id", protect, getTaskById);

// CREATE task — only admin or project_manager
router.post("/", protect, authorize("admin", "project_manager"), createTask);

// UPDATE task — all roles (controller handles what each role can change)
router.put("/:id", protect, updateTask);

// DELETE task — only admin or project_manager
router.delete("/:id", protect, authorize("admin", "project_manager"), deleteTask);

module.exports = router;
