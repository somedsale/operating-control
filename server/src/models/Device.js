// server/src/models/Device.js
const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:     { type: String, default: '' },
    relay:    { type: Number, default: 0 },
    isOn:     { type: Boolean, default: false },
    hwOn:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', DeviceSchema);
