// server/src/routes/aiConfigRoutes.js
// REST API cho cấu hình kênh AI (1..4) — mode: 'AI' | 'MODBUS', addr override

const express = require('express');
const router = express.Router();
const aiCfg = require('../services/aiConfig.service'); // initAndApply(), setChannelMode(), getAll(), getChannel(), setChannelAddr()

/* ========== Helpers ========== */
function parseIndex(param) {
  const i = Number(param);
  if (!Number.isInteger(i) || i < 1 || i > 4) {
    const err = new Error('AI_CHANNEL_OOB');
    err.status = 400;
    err.details = 'index must be an integer in [1..4]';
    throw err;
  }
  return i;
}

function normalizeMode(m) {
  const s = String(m || '').trim().toUpperCase();
  if (!['AI', 'MODBUS'].includes(s)) {
    const err = new Error('INVALID_AI_MODE');
    err.status = 400;
    err.details = "mode must be 'AI' or 'MODBUS'";
    throw err;
  }
  return s;
}

/* ========== ROUTES ========== */

/** 
 * PATCH /bulk-mode/all
 * Đặt mode hàng loạt cho 4 kênh: { mode: "AI" | "MODBUS" }
 * ⚠️ Cần đặt route này trước '/:index' để tránh bị Express match nhầm
 */
router.patch('/bulk-mode/all', async (req, res, next) => {
  try {
    const mode = normalizeMode(req.body?.mode);
    const results = [];
    for (let i = 1; i <= 4; i++) {
      const doc = await aiCfg.setChannelMode(i, mode);
      results.push({ index: i, mode: doc?.mode });
    }
    res.json({ ok: true, results });
  } catch (e) { next(e); }
});

/** GET / — Lấy danh sách tất cả kênh + auto seed nếu chưa có */
router.get('/', async (_req, res, next) => {
  try {
    await aiCfg.initAndApply();
    const items = await aiCfg.getAll();
    res.json({ ok: true, items });
  } catch (e) { next(e); }
});

/** GET /:index — Lấy cấu hình 1 kênh */
router.get('/:index', async (req, res, next) => {
  try {
    const index = parseIndex(req.params.index);
    const item = await aiCfg.getChannel(index);
    if (!item) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
    res.json({ ok: true, item });
  } catch (e) { next(e); }
});

/** PATCH /:index/mode — Đặt mode 1 kênh */
router.patch('/:index/mode', async (req, res, next) => {
  try {
    const index = parseIndex(req.params.index);
    const mode = normalizeMode(req.body?.mode);
    const doc = await aiCfg.setChannelMode(index, mode);
    res.json({ ok: true, index, mode: doc?.mode });
  } catch (e) { next(e); }
});

/** PATCH /:index/addr — Đặt hoặc xoá địa chỉ override */
router.patch('/:index/addr', async (req, res, next) => {
  try {
    const index = parseIndex(req.params.index);
    const addr = String(req.body?.addr || '').trim();
    const doc = await aiCfg.setChannelAddr(index, addr || null);
    res.json({ ok: true, index, addr: doc?.addr || '' });
  } catch (e) { next(e); }
});

/* ========== LOCAL ERROR HANDLER ========== */
router.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    ok: false,
    error: err.message || 'INTERNAL_ERROR',
    details: err.details || null,
  });
});

module.exports = router;
