// server/models/LicenseConfig.js
const mongoose = require("mongoose");

const LicenseConfigSchema = new mongoose.Schema({
  installedAt: { type: Date, default: () => new Date() }, // lần cài / khởi tạo
  expiresAt:   { type: Date, default: null },              // hết hạn tuyệt đối (UTC)
  trialDays:   { type: Number, default: 30 },              // fallback nếu chưa set expiresAt
  activated:   { type: Boolean, default: false },          // đã nhập key hợp lệ?
  licenseHash: { type: String, default: "" },              // SHA256 base64 của key
}, { timestamps: true });

module.exports = mongoose.model("LicenseConfig", LicenseConfigSchema);
