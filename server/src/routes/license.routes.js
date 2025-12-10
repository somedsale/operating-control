// server/src/routes/license.routes.js
const express = require("express");
const crypto = require("crypto");
const LicenseConfig = require("../models/LicenseConfig"); // nhớ đúng đường dẫn tới model

const router = express.Router();

/* ===== Helpers ===== */
const MS_DAY = 24 * 60 * 60 * 1000;

// Tạo/đọc bản ghi cấu hình license (1 bản ghi duy nhất)
async function getCfg() {
  let cfg = await LicenseConfig.findOne();
  if (!cfg) cfg = await LicenseConfig.create({});
  return cfg;
}

// Convert 'YYYY-MM-DD' (giờ máy chủ) -> cuối ngày UTC
function endOfLocalDayToUTC(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const local = new Date(y, m - 1, d, 23, 59, 59, 999);
  return new Date(local.getTime());
}

function computeLeftDays({ installedAt, expiresAt, trialDays }) {
  const now = Date.now();
  if (expiresAt) {
    const leftMs = new Date(expiresAt).getTime() - now;
    return Math.ceil(leftMs / MS_DAY);
  }
  const used = Math.floor((now - new Date(installedAt || Date.now()).getTime()) / MS_DAY);
  return Number(trialDays || 30) - used;
}

/* ===== PUBLIC ===== */

// GET /api/license/status
router.get("/status", async (_req, res, next) => {
  try {
    const cfg = await getCfg();
    const left = computeLeftDays(cfg);
    res.json({
      activated: !!cfg.activated,
      left,
      over: left < 0 ? left : 0,
      trialDays: cfg.trialDays ?? 30,
      expiresAt: cfg.expiresAt ?? null,
    });
  } catch (e) { next(e); }
});

// POST /api/license/activate { key }
router.post("/activate", express.json(), async (req, res, next) => {
  try {
    const { key } = req.body || {};
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Thiếu key" });
    }
    const cfg = await getCfg();
    if (!cfg.licenseHash) {
      return res.status(409).json({ error: "Chưa cấu hình license key." });
    }
    const hash = crypto.createHash("sha256").update(key.trim(), "utf8").digest("base64");
    if (hash !== cfg.licenseHash) {
      return res.status(401).json({ error: "Key không hợp lệ" });
    }
    cfg.activated = true;
    await cfg.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ===== ADMIN (yêu cầu middleware requireAdmin) ===== */
const { requireAdmin } = require("./auth.admin");

// GET /api/license/admin/config
router.get("/admin/config", requireAdmin, async (_req, res, next) => {
  try {
    const cfg = await getCfg();
    res.json({
      installedAt: cfg.installedAt,
      expiresAt: cfg.expiresAt ?? null,
      trialDays: cfg.trialDays ?? 30,
      activated: !!cfg.activated,
      hasLicenseHash: !!cfg.licenseHash,
    });
  } catch (e) { next(e); }
});

// PUT /api/license/admin/config
router.put("/admin/config", requireAdmin, express.json(), async (req, res, next) => {
  try {
    const { expiresAt, trialDays, activated, licenseKeyPlaintext } = req.body || {};
    const cfg = await getCfg();

    if (typeof trialDays === "number" && trialDays >= 0) cfg.trialDays = Math.floor(trialDays);
    if (typeof activated === "boolean") cfg.activated = activated;

    if (typeof expiresAt === "string" && expiresAt) cfg.expiresAt = endOfLocalDayToUTC(expiresAt);
    else if (expiresAt === null) cfg.expiresAt = null;

    if (typeof licenseKeyPlaintext === "string" && licenseKeyPlaintext.trim()) {
      cfg.licenseHash = crypto.createHash("sha256").update(licenseKeyPlaintext.trim(), "utf8").digest("base64");
    }

    await cfg.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
