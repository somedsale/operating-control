const express = require("express");
const router = express.Router();
const plc = require("../services/plc.service");

/**
 * GET /api/plc/health
 * Trả về tình trạng kết nối PLC:
 *   { ok: true|false, status: {...} }
 */
router.get("/health", (req, res) => {
  try {
    const status = {
      DO:  plc?.__connDO?.__connected ?? false,
      DI:  plc?.__connDI?.__connected ?? false,
      AI:  plc?.__connAI?.__connected ?? false,
      SYS: plc?.__connSYS?.__connected ?? false,
    };

    const ok = Object.values(status).some(Boolean);
    res.json({ ok, status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

module.exports = router;
