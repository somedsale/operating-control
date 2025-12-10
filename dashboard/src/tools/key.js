// node tools/make_key.js <INSTALL_ID> <TRIAL_START_YYYY-MM-DD>
const crypto = require("crypto");

const SECRET_FALLBACK = "SOMED-SECRET-V1"; // phải trùng với client (demo offline)

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function makeKey(installId, trialStart) {
  const raw = `${installId}|${trialStart}|${SECRET_FALLBACK}`;
  const digest = sha256Hex(raw).toUpperCase();
  return digest.slice(0, 12); // ví dụ: 12 ký tự
}

const [ , , installId, trialStart ] = process.argv;
if (!installId || !trialStart) {
  console.log("Usage: node tools/make_key.js <INSTALL_ID> <TRIAL_START_YYYY-MM-DD>");
  process.exit(1);
}
console.log(makeKey(installId, trialStart));
