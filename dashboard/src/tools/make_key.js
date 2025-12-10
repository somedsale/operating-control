#!/usr/bin/env node
/**
 * make_key.js
 * Tạo LICENSE key và hash SHA-256 (base64) cho LicenseGate.jsx
 *
 * Cách dùng:
 *   1) Tự đưa plaintext key:  node tools/make_key.js "SOMED-OPERATING-PANEL-KEY-2025"
 *   2) Để script tự tạo key ngẫu nhiên: node tools/make_key.js --random
 *   3) Ràng buộc theo máy (tùy chọn):  node tools/make_key.js "MYKEY" --machine ABC123
 *
 * Kết quả in ra: PLAINTEXT key + SHA-256 base64 (để dán vào LICENSE_KEY_SHA256_B64)
 */

const crypto = require("crypto");

// ===== helpers =====
function toSha256Base64(str) {
  const digest = crypto.createHash("sha256").update(str, "utf8").digest();
  return digest.toString("base64");
}

function genRandomKey(len = 32) {
  // Kết hợp chữ hoa/thường + số, tránh ký tự dễ nhầm
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    const idx = crypto.randomInt(0, alphabet.length);
    out += alphabet[idx];
  }
  // Thêm dấu gạch để dễ đọc (4-4-4-4-…)
  return out.match(/.{1,4}/g).join("-");
}

// ===== parse args =====
const args = process.argv.slice(2);
let plaintext = null;
let bindMachine = null;
let randomMode = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--random") {
    randomMode = true;
  } else if (a === "--machine") {
    bindMachine = args[i + 1];
    i++;
  } else if (!plaintext) {
    plaintext = a;
  }
}

// ===== main =====
(function main() {
  if (randomMode && !plaintext) plaintext = genRandomKey(32);
  if (!plaintext) {
    console.error("⚠️  Thiếu key.\n");
    console.log("Cách dùng:");
    console.log('  node tools/make_key.js "SOMED-OPERATING-PANEL-KEY-2025"');
    console.log("  node tools/make_key.js --random");
    console.log('  node tools/make_key.js "MYKEY" --machine ABC123');
    process.exit(1);
  }

  // Nếu có ràng buộc máy, ta hash trên chuỗi: `${plaintext}::${machineId}`
  const effective = bindMachine ? `${plaintext}::${bindMachine}` : plaintext;
  const hashB64 = toSha256Base64(effective);

  console.log("✅ TẠO KEY THÀNH CÔNG");
  console.log("---------------------------");
  console.log("PLAINTEXT KEY:");
  console.log(plaintext);
  if (bindMachine) {
    console.log("\n(MODE MÁY):");
    console.log(`Machine ID: ${bindMachine}`);
    console.log("Hash dựa trên: plaintext + '::' + machineId");
  }
  console.log("\nLICENSE_KEY_SHA256_B64 (dán vào LicenseGate.jsx):");
  console.log(hashB64);
  console.log("---------------------------");
  console.log("Gợi ý dán vào LicenseGate.jsx:");
  console.log(`// const LICENSE_PLAINTEXT_KEY = "${plaintext}"; // (đừng để production)`);
  console.log(`const LICENSE_KEY_SHA256_B64 = "${hashB64}";`);
})();
