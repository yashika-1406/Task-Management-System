const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
// ─── Routes ─────────────────────────────────────────────
const authRoutes    = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes    = require("./routes/taskRoutes");
const userRoutes    = require("./routes/userRoutes");
const teamRoutes    = require("./routes/teamRoutes");
const reportRoutes  = require("./routes/reportRoutes");

app.use("/api/auth",     authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks",    taskRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/teams",    teamRoutes);
app.use("/api/reports",  reportRoutes);

// ─── Health Check ────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("TaskFlow Backend is running 🚀");
});

// ─── Connect DB ──────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});