// server/src/controllers/gas.controller.js
const gasService = require("../services/gas.service");

// Chuẩn hóa mã khí
const normCode = (v) => String(v || "").toUpperCase();

/**
 * GET /api/gas
 * Trả mảng [{ code, status }] với status ∈ {0,1,2}
 */
async function list(req, res) {
  try {
    const data = await gasService.listOrdered();
    const shaped = (data || []).map((d) => ({
      code: d.code,
      status: Number(d?.status) === 1 ? 1 : Number(d?.status) === 2 ? 2 : 0,
    }));
    res.json(shaped);
  } catch (e) {
    console.error("[gas] list error:", e);
    res.status(500).json({ error: "Failed to fetch gas statuses" });
  }
}

/**
 * GET /api/gas/:code
 * Trả { code, status } với status ∈ {0,1,2}
 */
async function getOne(req, res) {
  try {
    const code = normCode(req.params.code);
    const row = await gasService.getByCode(code);
    if (!row) return res.status(404).json({ error: "Gas not found" });
    const status = Number(row.status) === 1 ? 1 : Number(row.status) === 2 ? 2 : 0;
    res.json({ code: row.code, status });
  } catch (e) {
    console.error("[gas] getOne error:", e);
    res.status(500).json({ error: "Failed to fetch gas status" });
  }
}

/**
 * PATCH /api/gas/:code
 * Body: { status: 0|1|2 | 'normal'|'high'|'low' }
 * Trả { code, status } đã cập nhật
 */
async function setStatus(req, res) {
  try {
    const code = normCode(req.params.code);
    // Không normalize nhị phân; để service tự parse/validate 0|1|2
    const row = await gasService.setStatus(code, req.body?.status);
    if (!row) return res.status(404).json({ error: "Gas not found" });
    const status = Number(row.status) === 1 ? 1 : Number(row.status) === 2 ? 2 : 0;
    res.json({ code: row.code, status });
  } catch (e) {
    console.error("[gas] setStatus error:", e?.message || e);
    // Service sẽ ném lỗi INVALID_STATUS… => 400
    const msg = e?.message || "Failed to update gas status";
    const code = /INVALID_STATUS|UNKNOWN_GAS_CODE/i.test(msg) ? 400 : 500;
    res.status(code).json({ error: msg });
  }
}

/**
 * PUT /api/gas/bulk
 * Body: { items: [{ code, status }] } ; status có thể là 0|1|2 hoặc 'normal'|'high'|'low'
 * Trả mảng [{ code, status }] (status ∈ {0,1,2})
 */
async function bulk(req, res) {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items must be an array" });
    }

    // Không ép 0/1; để service tự parse 0/1/2/chuỗi
    const cleaned = items
      .map((it) => ({
        code: normCode(it?.code || it?.id),
        status: it?.status,
      }))
      .filter((it) => it.code); // bỏ item thiếu code

    const data = await gasService.bulkUpdate(cleaned);
    const shaped = (data || []).map((d) => ({
      code: d.code,
      status: Number(d?.status) === 1 ? 1 : Number(d?.status) === 2 ? 2 : 0,
    }));
    res.json(shaped);
  } catch (e) {
    console.error("[gas] bulk error:", e?.message || e);
    const msg = e?.message || "Failed to bulk update gas statuses";
    const code = /INVALID_STATUS|UNKNOWN_GAS_CODE/i.test(msg) ? 400 : 500;
    res.status(code).json({ error: msg });
  }
}

module.exports = {
  list,
  getOne,
  setStatus,
  bulk,
};
