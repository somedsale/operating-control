// server/src/controllers/gas.controller.js
const gasService = require("../services/gas.service");

function normalize01(v) {
  const n = Number(v);
  return n === 1 ? 1 : 0; // chỉ 0 hoặc 1
}

async function list(req, res) {
  try {
    const data = await gasService.listOrdered();
    const shaped = (data || []).map((d) => ({
      code: d.code,
      status: normalize01(d?.status),
    }));
    res.json(shaped);
  } catch (e) {
    console.error("[gas] list error:", e);
    res.status(500).json({ error: "Failed to fetch gas statuses" });
  }
  // --- MOCK ---
// res.json([
//   { code: "O2", status: 1 },
//   { code: "N2O", status: 1 },
//   { code: "MA4", status: 0 },
//   { code: "MA7", status: 0 },
//   { code: "VA", status: 0 },
//   { code: "CO2", status: 0 },
// ]);

}

async function getOne(req, res) {
  try {
    const code = String(req.params.code || "").toUpperCase();
    const row = await gasService.getByCode(code);
    if (!row) return res.status(404).json({ error: "Gas not found" });
    res.json({ code: row.code, status: normalize01(row.status) });
  } catch (e) {
    console.error("[gas] getOne error:", e);
    res.status(500).json({ error: "Failed to fetch gas status" });
  }
}

async function setStatus(req, res) {
  try {
    const code = String(req.params.code || "").toUpperCase();
    const statusNum = normalize01(req.body?.status);
    // Nếu muốn strict validation thay vì normalize, dùng:
    // if (![0,1].includes(Number(req.body?.status))) return res.status(400).json({ error: "Invalid status. Use 0|1" });

    const row = await gasService.setStatus(code, statusNum);
    if (!row) return res.status(404).json({ error: "Gas not found" });
    res.json({ code: row.code, status: normalize01(row.status) });
  } catch (e) {
    console.error("[gas] setStatus error:", e);
    res.status(500).json({ error: "Failed to update gas status" });
  }
}

async function bulk(req, res) {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items must be an array" });
    }
    // Chuẩn hoá input về 0/1
    const normalized = items.map((it) => ({
      code: String(it.code || it.id || "").toUpperCase(),
      status: normalize01(it.status),
    }));
    const data = await gasService.bulkUpdate(normalized);
    const shaped = (data || []).map((d) => ({
      code: d.code,
      status: normalize01(d?.status),
    }));
    res.json(shaped);
  } catch (e) {
    console.error("[gas] bulk error:", e);
    res.status(500).json({ error: "Failed to bulk update gas statuses" });
  }
}

module.exports = {
  list,
  getOne,
  setStatus,
  bulk,
};
