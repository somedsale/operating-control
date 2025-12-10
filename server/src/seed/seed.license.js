/* Seed LicenseConfig (tạo/cập nhật mặc định)
 * Usage:
 *   node server/src/scripts/seed.license.js
 *   node server/src/scripts/seed.license.js --reset          // (tuỳ chọn) xoá dữ liệu cũ rồi seed lại
 *   node server/src/scripts/seed.license.js --show           // chỉ in cấu hình hiện tại
 *   node server/src/scripts/seed.license.js --key="PLAINTEXT" --expire-days=30 --trial-days=45 --activate --force
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { connect } = require("../../config/database"); // <-- db connect của bạn
// Nếu model của bạn nằm ở "server/models/LicenseConfig.js", đổi lại: "../../models/LicenseConfig"
const LicenseConfig = require("../models/LicenseConfig");

const crypto = require("crypto");

/* ===== Helpers ===== */
const MS_DAY = 24 * 60 * 60 * 1000;

function sha256b64(s) {
  return crypto.createHash("sha256").update(String(s), "utf8").digest("base64");
}
function generatePlaintextKey(len = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ ký tự dễ nhầm
  let out = "SOMED-";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
    if ((i + 1) % 4 === 0 && i < len - 1) out += "-";
  }
  return out;
}
function endOfLocalDayToUTC(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
  if (!m) throw new Error("Invalid date format YYYY-MM-DD");
  const y = Number(m[1]), mm = Number(m[2]), dd = Number(m[3]);
  const local = new Date(y, mm - 1, dd, 23, 59, 59, 999);
  if (local.getFullYear() !== y || (local.getMonth()+1) !== mm || local.getDate() !== dd) {
    throw new Error("Invalid calendar date");
  }
  return local;
}
function addDaysEndOfLocalDay(fromDate, days) {
  const localEnd = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 23, 59, 59, 999);
  return new Date(localEnd.getTime() + Number(days) * MS_DAY);
}
function printCfg(cfg) {
  const out = {
    installedAt: cfg.installedAt ? new Date(cfg.installedAt).toISOString() : null,
    expiresAt:   cfg.expiresAt   ? new Date(cfg.expiresAt).toISOString()   : null,
    trialDays:   cfg.trialDays,
    activated:   !!cfg.activated,
    activatedAt: cfg.activatedAt ? new Date(cfg.activatedAt).toISOString() : null,
    hasLicenseHash: !!cfg.licenseHash,
  };
  console.table(out);
}

/* ===== Flags (đơn giản, giống style) ===== */
const args = process.argv.slice(2);
function getFlagVal(name) {
  const p = `--${name}=`;
  const hit = args.find(a => a.startsWith(p));
  return hit ? hit.slice(p.length) : undefined;
}
function hasFlag(name) { return args.includes(`--${name}`); }

const FLAG_RESET       = hasFlag("reset");
const FLAG_SHOW        = hasFlag("show");
const FLAG_FORCE       = hasFlag("force");
const FLAG_ACTIVATE    = hasFlag("activate");
const FLAG_KEY         = getFlagVal("key");           // plaintext
const FLAG_EXPIRE_DAYS = getFlagVal("expire-days");   // integer
const FLAG_EXPIRE_DATE = getFlagVal("expire-date");   // YYYY-MM-DD
const FLAG_TRIAL_DAYS  = getFlagVal("trial-days");    // integer

/* 
async function main() {
  await connect();

  if (FLAG_RESET) {
    // Xoá toàn bộ collection (idempotent với try-catch)
    try {
      await LicenseConfig.collection.drop();
      console.log("[seed:license] Dropped collection licenseconfigs");
    } catch (e) {
      if (e.codeName === "NamespaceNotFound") {
        console.log("[seed:license] Collection not found, will create new.");
      } else {
        console.error("[seed:license] Drop collection error:", e.message);
      }
    }
  }

  let cfg = await LicenseConfig.findOne();

  if (FLAG_SHOW && cfg) {
    console.log("[seed:license] Current LicenseConfig:");
    printCfg(cfg);
    process.exit(0);
  }

  // Nếu chưa có → tạo mới với mặc định
  if (!cfg) {
    const installedAt = new Date();
    const trialDays = FLAG_TRIAL_DAYS ? Math.max(0, Math.floor(Number(FLAG_TRIAL_DAYS))) : 30;

    const plaintext = FLAG_KEY || generatePlaintextKey();
    const licenseHash = sha256b64(String(plaintext).trim());

    let expiresAt = null;
    if (FLAG_EXPIRE_DATE) {
      expiresAt = endOfLocalDayToUTC(FLAG_EXPIRE_DATE);
    } else if (FLAG_EXPIRE_DAYS) {
    sEndOfLocalDay(new Date(), Number(FLA

    cfg = await LicenseConfig.create({
      installedAt,
      trialDays,
      activated: !!FLAG_ACTIVATE,
      activatedAt: FLAG_ACTIVATE ? new Date() : null,
      licenseHash,
      expiresAt,
    });

    console.log("[seed:license] Created new LicenseConfig.");
    if (!FLAG_KEY) {
      console.warn("[seed:license] >>> GENERATED DEFAULT KEY (store securely):", plaintext);
    } else {
      console.log("[seed:license] Used provided plaintext key.");
    }
    printCfg(cfg);
    process.exit(0);
  }

  // Đã có sẵn và không --force → không ghi đè
  if (!FLAG_FORCE && !FLAG_SHOW) {
    console.log("[seed:license] LicenseConfig already exists. Use --force to update.");
    printCfg(cfg);
    process.exit(0);
  }

  // Cập nhật theo flags
  let mutated = false;

  if (FLAG_KEY) {
    cfg.licenseHash = sha256b64(String(FLAG_KEY).trim());
    mutated = true;
    console.log("[seed:license] Updated licenseHash from provided key.");
  }
  if (FLAG_TRIAL_DAYS) {
    cfg.trialDays = Math.max(0, Math.floor(Number(FLAG_TRIAL_DAYS)));
    mutated = true;
    console.log("[seed:license] Updated trialDays:", cfg.trialDays);
  }
  if (FLAG_EXPIRE_DATE) {
    cfg.expiresAt = endOfLocalDayToUTC(FLAG_EXPIRE_DATE);
    mutated = true;
:license] Updated expiresAt (from date):", cfg.expiresAt.toISOString());
  } else if (
    cfg.expiresAt = addDaysEndOfLocalDay(new Date(), Number(FLAG_EXPIRE_DAYS));
    mutated = true;
    console.log("[seed:license] Updated expiresAt (from days):", cfg.expiresAt.toISOString());
  }
  if (FLAG_ACTIVATE) {
    if (!cfg.activated) {
      cfg.activated = true;
      cfg.activatedAt = new Date();
      mutated = true;
      console.log("[seed:license] Activated license.");
    } else {
      console.log("[seed:license] License already activated.");
    }
  }

  if (mutated) {
    await cfg.save();
    console.log("[seed:license] LicenseConfig updated.");
  } else {
    console.log("[seed:license] Nothing to update.");
  }

  printCfg(cfg);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed:license] Error:", err);
  process.exit(1);
});
