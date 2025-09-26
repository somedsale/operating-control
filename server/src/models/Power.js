// server/src/models/Power.js
const mongoose = require('mongoose');

const PowerSchema = new mongoose.Schema(
  {
    key:   { type: String, enum: ['ups', 'ips', 'main'], unique: true, required: true },
    title: { type: String, required: true },
    status:{ type: Boolean, default: true }, // true = Normal, false = Fault
    meta:  { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

// Tạo 3 bản ghi mặc định nếu thiếu
PowerSchema.statics.ensureDefaults = async function () {
  const defaults = [
    { key: 'ups',  title: 'UPS Status',            status: true },
    { key: 'ips',  title: 'IPS Status',            status: true },
    { key: 'main', title: 'Main Supply Status',    status: true },
  ];
  for (const d of defaults) {
    await this.updateOne({ key: d.key }, { $setOnInsert: d }, { upsert: true });
  }
};

module.exports = mongoose.model('Power', PowerSchema);
