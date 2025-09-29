// server/src/controllers/powerController.js
const Power = require('../models/Power');

const ORDER = ['ups', 'ips', 'main'];

module.exports = {
  // GET /api/power  → trả mảng theo thứ tự: ups, ips, main
  list: async (req, res) => {
    try {
      await Power.ensureDefaults();
      const docs = await Power.find({}).lean();
      const byKey = Object.fromEntries(docs.map(d => [d.key, d]));
      const arr = ORDER.map(k => byKey[k] || { key: k, title: k.toUpperCase(), status: false });
      return res.json(arr);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
    // --- MOCK ---
    // res.json([
    //   { key: 'ups', title: 'UPS', status: false },
    //   { key: 'ips', title: 'IPS', status: true },
    //   { key: 'main', title: 'Main', status: false },
    // ]);
  },

  // GET /api/power/:key
  getOne: async (req, res) => {
    try {
      const doc = await Power.findOne({ key: req.params.key }).lean();
      if (!doc) return res.status(404).json({ error: 'Not found' });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  },

  // PUT /api/power/:key/status  { status: boolean }
  setStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (typeof status !== 'boolean') {
        return res.status(400).json({ error: 'status must be boolean' });
      }
      const doc = await Power.findOneAndUpdate(
        { key: req.params.key },
        { status },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Not found' });
      return res.json(doc);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  },

  // PUT /api/power   [ { key, status }, ... ]
  bulkSet: async (req, res) => {
    try {
      const list = Array.isArray(req.body) ? req.body : req.body?.items;
      if (!Array.isArray(list)) {
        return res.status(400).json({ error: 'Expect array of { key, status }' });
      }

      const bulk = Power.collection.initializeUnorderedBulkOp();
      let count = 0;
      for (const it of list) {
        if (!it || typeof it.key !== 'string' || typeof it.status !== 'boolean') continue;
        bulk.find({ key: it.key }).updateOne({ $set: { status: it.status } });
        count++;
      }
      if (count > 0) await bulk.execute();

      const docs = await Power.find({}).lean();
      return res.json(docs);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  },
};
