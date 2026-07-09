const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* ===================================
   PROTECT — Verify JWT token
=================================== */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found." });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: "Account is deactivated." });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized. Invalid token." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token provided." });
  }
};

/* ===================================
   ROLE GUARD — Restrict by role
   Usage: authorize("admin", "project_manager")
=================================== */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };