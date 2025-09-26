// server/src/seed/seedPower.js
require('dotenv').config(); // đọc .env nếu có

const path = require('path');
const mongoose = require('mongoose');
const { connect } = require('../../config/database'); // chỉnh path nếu khác
const Power = require('../models/Power');

const DEFAULTS = [
  { key: 'ups',  title: 'UPS Status',             status: true  },
  { key: 'ips',  title: 'IPS Status',             status: true  },
  { key: 'main', title: 'Main Supply Status',     status: true  },
];

(async () => {
  try {
    await connect();

    // Cho phép override nhanh qua env: SEED_POWER="ups:false,ips:true,main:true"
    // -> parse thành object { ups:false, ips:true, main:true }
    let overrides = {};
    const raw = process.env.SEED_POWER;
    if (raw) {
      raw.split(',').forEach(pair => {
        const [k, v] = pair.split(':').map(s => s.trim());
        if (k && typeof v !== 'undefined') overrides[k] = String(v).toLowerCase() === 'true';
      });
    }

    for (const item of DEFAULTS) {
      const doc = {
        ...item,
        ...(Object.prototype.hasOwnProperty.call(overrides, item.key)
          ? { status: overrides[item.key] }
          : {}),
      };
      await Power.updateOne({ key: doc.key }, { $set: doc }, { upsert: true });
    }

    const docs = await Power.find({}).lean();
    console.log('Seeded Power:', docs.map(d => ({ key: d.key, title: d.title, status: d.status })));

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[seedPower] error:', err.message);
    try { await mongoose.connection.close(); } catch {}
    process.exit(1);
  }
})();
