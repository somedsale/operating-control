// server/src/models/PinConfig.js
const mongoose = require("mongoose");

const PinConfigSchema = new mongoose.Schema({
  algo: { type: String, default: "scrypt" },
  salt: { type: String, required: true },
  hash: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PinConfig", PinConfigSchema);
