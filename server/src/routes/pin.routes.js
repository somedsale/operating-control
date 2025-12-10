// server/src/routes/pin.routes.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
let PinConfig = null;

// Thử nạp model nếu dùng MongoDB
try {
  PinConfig = require("../models/PinConfig");
} catch (_) {
  PinConfig = null; // Cho phép chạy chỉ với ENV fallback nếu chưa tạo model
}

// PIN mặc định (fallback nếu DB chưa set)
const FALLBACK_PIN = process.env.PIN_CODE ?? "1";

/* ---------------- Helpers ---------------- */
function hashPin(pin, salt = crypto.randomBytes(16).toString("hex")) {
  const key = crypto.scryptSync(String(pin), salt, 64).toString("hex");
  return { salt, hash: key };
}
function verifyPin(pin, salt, hash) {
  const test = crypto.scryptSync(String(pin), String(salt), 64).toString("hex");
  // so sánh an toàn
  return crypto.timingSafeEqual(Buffer.from(test, "hex"), Buffer.from(hash, "hex"));
}

async function getPinConfig() {
  if (!PinConfig) return null;
  return await PinConfig.findOne();
}

async function setPinConfig(newPin) {
  if (!PinConfig) throw new Error("PinConfig model not available");
  const { salt, hash } = hashPin(newPin);
  let cfg = await PinConfig.findOne();
  if (!cfg) cfg = new PinConfig();
  cfg.salt = salt;
  cfg.hash = hash;
  cfg.updatedAt = new Date();
  await cfg.save();
  return cfg;
}

/* ---------------- Routes ---------------- */

// Health check (tiện test nhanh reverse-proxy)
router.get("/health", (req, res) => res.json({ ok: true, ready: true }));

/**
 * POST /api/pin/verify
 * Body: { pin: "..." }
 * Logic: nếu DB có pin → verify theo hash; nếu chưa có → dùng ENV FALLBACK_PIN
 */
router.post("/verify", async (req, res) => {
  try {
    const { pin } = req.body || {};
    if (pin == null) {
      return res.status(400).json({ ok: false, message: "Thiếu PIN" });
    }

    const cfg = await getPinConfig();
    if (cfg && cfg.salt && cfg.hash) {
      const ok = verifyPin(pin, cfg.salt, cfg.hash);
      return ok
        ? res.json({ ok: true })
        : res.status(401).json({ ok: false, message: "PIN không đúng" });
    }

    // Chưa có trong DB → dùng PIN fallback từ ENV
    if (String(pin) === String(FALLBACK_PIN)) {
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, message: "PIN không đúng" });
  } catch (e) {
    console.error("[pin.verify] ", e);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ" });
  }
});

/**
 * GET /api/pin/config
 * Trả: { ok, hasPin, updatedAt }
 * (Không trả PIN)
 */
router.get("/config", async (req, res) => {
  try {
    const cfg = await getPinConfig();
    return res.json({
      ok: true,
      hasPin: !!(cfg && cfg.salt && cfg.hash),
      updatedAt: cfg?.updatedAt || null,
    });
  } catch (e) {
    console.error("[pin.config.get] ", e);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ" });
  }
});

/**
 * PUT /api/pin/config
 * Body: { oldPin, newPin }
 * - Yêu cầu nhập đúng oldPin:
 *   - Nếu DB đã có PIN → so sánh hash
 *   - Nếu DB chưa có → so sánh với FALLBACK_PIN (ENV hoặc "1")
 * - newPin chỉ cho phép số, tối đa 6 ký tự
 */
router.put("/config", async (req, res) => {
  try {
    const { oldPin, newPin } = req.body || {};
    if (!newPin) {
      return res.status(400).json({ ok: false, message: "Thiếu newPin" });
    }
    if (!/^\d+$/.test(String(newPin)) || String(newPin).length > 6) {
      return res
        .status(400)
        .json({ ok: false, message: "PIN chỉ gồm số, tối đa 6 chữ số" });
    }

    const cfg = await getPinConfig();

    // Bắt buộc phải có oldPin để đổi
    if (!oldPin && (cfg || FALLBACK_PIN)) {
      return res
        .status(401)
        .json({ ok: false, message: "Thiếu PIN hiện tại" });
    }

    // Xác thực oldPin
    let validOld = false;
    if (cfg && cfg.salt && cfg.hash) {
      validOld = verifyPin(oldPin, cfg.salt, cfg.hash);
    } else {
      validOld = String(oldPin) === String(FALLBACK_PIN);
    }
    if (!validOld) {
      return res
        .status(401)
        .json({ ok: false, message: "PIN hiện tại không đúng" });
    }

    // Lưu PIN mới (hash)
    if (!PinConfig) {
      // Nếu bạn chưa có DB, cảnh báo để tránh nhầm tưởng đã lưu bền vững
      return res.status(501).json({
        ok: false,
        message:
          "Chưa cấu hình DB/Model cho PIN. Hãy tạo models/PinConfig.js để lưu PIN.",
      });
    }

    const saved = await setPinConfig(newPin);
    return res.json({ ok: true, updatedAt: saved.updatedAt });
  } catch (e) {
    console.error("[pin.config.put] ", e);
    return res.status(500).json({ ok: false, message: "Lỗi máy chủ" });
  }
});

module.exports = router;
