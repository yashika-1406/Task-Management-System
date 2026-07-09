const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createTeam,
  getTeams,
  updateTeam,
  deleteTeam,
} = require("../controllers/teamController");

const router = express.Router();

router.route("/")
  .get(protect, getTeams)
  .post(protect, createTeam);

router.route("/:id")
  .put(protect, updateTeam)
  .delete(protect, deleteTeam);

module.exports = router;
