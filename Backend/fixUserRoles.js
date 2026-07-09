/**
 * One-time script: Set role for existing users who have no role
 * Run with: node fixUserRoles.js
 * 
 * Sets all users with no role to "admin" for the first user,
 * and "team_member" for the rest.
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

async function fixUserRoles() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // Find all users without a role
  const usersWithoutRole = await User.find({
    $or: [{ role: { $exists: false } }, { role: null }, { role: "" }],
  });

  console.log(`Found ${usersWithoutRole.length} users without a role.`);

  if (usersWithoutRole.length === 0) {
    console.log("All users already have roles. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Set the FIRST user as admin, rest as team_member
  for (let i = 0; i < usersWithoutRole.length; i++) {
    const user = usersWithoutRole[i];
    const newRole = i === 0 ? "admin" : "team_member";
    await User.findByIdAndUpdate(user._id, {
      role: newRole,
      isActive: true,
    });
    console.log(`✔ ${user.email} → role set to "${newRole}"`);
  }

  console.log("\n✅ Done! Roles updated.");
  console.log("Now log out of the app and log back in to see the changes.\n");

  await mongoose.disconnect();
}

fixUserRoles().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
