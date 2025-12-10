// server/src/models/SensorReading.js
const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // 'temperature' | 'humidity' | 'pressure_filter' | 'pressure_room' ...
    value: { type: Number, required: true },
    ts: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);
// ✅ TTL Index: tự động xoá sau 2 ngày (48h = 172800 giây)
SensorReadingSchema.index({ ts: 1 }, { expireAfterSeconds: 172800 });

SensorReadingSchema.index({ type: 1, ts: -1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);
