// server/models/AdminUser.js
const mongoose = require("mongoose");

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true }, // bcrypt hash
}, { timestamps: true });

module.exports = mongoose.model("AdminUser", AdminUserSchema);
