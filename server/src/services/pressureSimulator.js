// server/src/services/pressureSimulator.js
const SensorReading = require('../models/SensorReading');

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function startPressureSimulation(opts = {}) {
  const {
    intervalMs = 5000,
    seedFilter = 100,   // Pa (áp suất lọc – chênh áp qua filter)
    seedRoom   = 12,    // Pa (áp suất phòng – dương nhẹ)
  } = opts;

  let filter = seedFilter;
  let room = seedRoom;

  async function tick() {
    // Nhiễu nhỏ dạng random-walk
    filter = clamp(filter + (Math.random() * 4 - 2), 70, 160);
    room   = clamp(room   + (Math.random() * 1.6 - 0.8),  0,  30);

    const docs = [
      { type: 'pressure_filter', value: Math.round(filter), ts: new Date() },
      { type: 'pressure_room',   value: Math.round(room),   ts: new Date() },
    ];
    try {
      await SensorReading.insertMany(docs, { ordered: false });
    } catch (e) {
      // ignore transient errors
    }
  }

  tick(); // ghi 1 mẫu ngay
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

module.exports = { startPressureSimulation };
