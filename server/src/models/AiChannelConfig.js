// server/src/models/AiChannelConfig.js
const mongoose = require('mongoose');

const AiChannelSchema = new mongoose.Schema(
  {
    index:   { type: Number, required: true, min: 1, max: 4, unique: true }, // 1..4
    mode:    { type: String, enum: ['AI', 'MODBUS'], default: 'AI', required: true },
    addr:    { type: String, default: '' },   // optional override: MW/IW/VW/MD...
    enabled: { type: Boolean, default: true },
  },
  { versionKey: false, timestamps: true }
);

module.exports = mongoose.model('AiChannelConfig', AiChannelSchema);
