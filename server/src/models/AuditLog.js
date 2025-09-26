const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    deviceId: String,
    action:   { type: String, enum: ["ON", "OFF", "SET"], required: true },
    payload:  Object,
    by:       String
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);
