// server/src/services/plc.service.js
// Siemens S7-200 SMART (nodes7) service
// - DO: Qx.y (r1..rN)
// - DI: I0.0..I1.3 + I8.0, I8.1
// - AI: MW20..MW26 (a1..a4)
// - MODBUS FIXED: MW10..MW16 (m1..m4)
// - SYS: M0.0 heartbeat pulse theo chu kỳ cấu hình (HEARTBEAT_MS)

require("dotenv").config();
const S7 = require("nodes7");

/* ================== ENV CONFIG ================== */
const PLC_IP = process.env.PLC_IP || "192.168.1.200";
const PLC_RACK = Number(process.env.PLC_RACK || 0);
const PLC_SLOT = Number(process.env.PLC_SLOT || 1);
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS || 5000);

/* ================== DO / DI ================== */
/* ---- DO (Relays) giữ nguyên theo ENV ---- */
const P_BYTE = Number(process.env.RELAY_PRIMARY_BYTE || 0);
const P_COUNT = Math.min(Number(process.env.RELAY_PRIMARY_COUNT || 8), 8);
const S_BYTE = Number(process.env.RELAY_SECOND_BYTE || 8);
const S_COUNT = Math.min(Number(process.env.RELAY_SECOND_COUNT || 3), 8);

const RELAY_MAP = {};
for (let i = 0; i < P_COUNT; i++) RELAY_MAP[`r${i + 1}`] = `Q${P_BYTE}.${i}`;
for (let i = 0; i < S_COUNT; i++) RELAY_MAP[`r${P_COUNT + i + 1}`] = `Q${S_BYTE}.${i}`;
const RELAY_KEYS = Object.keys(RELAY_MAP);

/* ---- DI: cố định I0.0..I1.3 + I8.0, I8.1 (14 input) ---- */
const INPUT_ADDRS = [
  "I0.0","I0.1","I0.2","I0.3","I0.4","I0.5","I0.6","I0.7",
  "I1.0","I1.1","I1.2","I1.3",
  "I8.0","I8.1",
];
const INPUT_MAP = {};
INPUT_ADDRS.forEach((addr, idx) => { INPUT_MAP[`i${idx + 1}`] = addr; });
const INPUT_KEYS = Object.keys(INPUT_MAP);

/* ================== AI CONFIG ================== */
const AI_ADDRS_DEFAULT = ["MW20", "MW22", "MW24", "MW26"];
const FIXED_ADDRS = ["MW10", "MW12", "MW14", "MW16"];
const AI_COUNT = AI_ADDRS_DEFAULT.length;
const AI_RAW_MAX = 27648;
const AI_DECIMALS = 2;

/* ================== RS485 over Merker (MB/MD) ================== */
const RS_TAGS = ["MB4", "MD6", "MB5"];

/* ================== CONNECTIONS ================== */
const connDO = new S7();
const connDI = new S7();
const connAI = new S7();
const connSYS = new S7();
connDO.setTranslationCB((t) => RELAY_MAP[t]);
connDI.setTranslationCB((t) => INPUT_MAP[t]);
connAI.setTranslationCB((t) => t);
connSYS.setTranslationCB((t) => t);

function connectOne(conn, name, addrs) {
  console.log(`[PLC ${name}] connecting...`);
  conn.initiateConnection({ port: 102, host: PLC_IP, rack: PLC_RACK, slot: PLC_SLOT }, (err) => {
    if (err) {
      console.error(`[PLC ${name}] connect error:`, err.message);
      setTimeout(() => connectOne(conn, name, addrs), 3000);
      return;
    }
    console.log(`[PLC ${name}] connected OK (${PLC_IP})`);
    try { if (addrs?.length) conn.addItems(addrs); } catch (_) {}
  });
}

connectOne(connDO, "DO", RELAY_KEYS);
connectOne(connDI, "DI", INPUT_KEYS);
connectOne(connAI, "AI", [...AI_ADDRS_DEFAULT, ...FIXED_ADDRS, ...RS_TAGS]);
connectOne(connSYS, "SYS", ["M0.0"]);

/* ================== HELPERS ================== */
function decodeU16(v) {
  if (typeof v === "number") return v & 0xffff;
  if (Buffer.isBuffer(v)) return v.readUInt16BE(0);
  return 0;
}
function decodeS16(v) {
  if (typeof v === "number") {
    const n = v & 0xffff;
    return (n & 0x8000) ? n - 0x10000 : n;
  }
  if (Buffer.isBuffer(v)) return v.readInt16BE(0);
  return 0;
}
function dByte(v)  { if (typeof v === "number") return v & 0xFF;  if (Buffer.isBuffer(v)) return v.readUInt8(0); return 0; }
function dDWord(v) { if (typeof v === "number") return v >>> 0;   if (Buffer.isBuffer(v)) return v.readUInt32BE(0); return 0; }
function rawToPercent(rawU16) {
  const r = Math.min(Math.max(rawU16, 0), AI_RAW_MAX);
  return Number(((r / AI_RAW_MAX) * 100).toFixed(AI_DECIMALS));
}
function normalizeErr(e) {
  return e?.message || String(e);
}

/* ================== READ ================== */
function readAnalogs() {
  // Trả về: a1..a4 với { raw (signed), rawU (unsigned), value(%), addr, mode:"AI" }
  return new Promise((resolve, reject) => {
    connAI.readAllItems((err, values) => {
      if (err) return reject(new Error(err.message || String(err)));
      if (!values) return resolve({});
      const out = {};
      AI_ADDRS_DEFAULT.forEach((addr, i) => {
        const rawS = decodeS16(values[addr]); // signed để support âm nếu PLC ghi âm
        const rawU = decodeU16(values[addr]); // unsigned để tính %
        out[`a${i + 1}`] = { raw: rawS, rawU, value: rawToPercent(rawU), addr, mode: "AI" };
      });
      resolve(out);
    });
  });
}

function readAnalogsFixed() {
  // Đọc MW10..16 theo signed 16-bit rồi chia 10 (VD: -71 -> -7.1)
  return new Promise((resolve, reject) => {
    connAI.readAllItems((err, values) => {
      if (err) return reject(new Error(err.message || String(err)));
      if (!values) return resolve({});
      const out = {};
      FIXED_ADDRS.forEach((addr, i) => {
        const rawS = decodeS16(values[addr]);     // signed!
        const val = Number((rawS / 10).toFixed(1));
        out[`m${i + 1}`] = { raw: rawS, value: val, addr, mode: "MODBUS" };
      });
      resolve(out);
    });
  });
}

function readRelays() {
  return new Promise((resolve, reject) => {
    connDO.readAllItems((err, values) => {
      if (err) return reject(new Error(normalizeErr(err)));
      const out = {};
      RELAY_KEYS.forEach((k) => (out[k] = !!values[k]));
      resolve(out);
    });
  });
}

function readInputs() {
  return new Promise((resolve, reject) => {
    connDI.readAllItems((err, values) => {
      if (err) return reject(new Error(normalizeErr(err)));
      const out = {};
      INPUT_KEYS.forEach((k) => (out[k] = !!values[k]));
      resolve(out);
    });
  });
}

/* ================== WRITE (DO) ================== */
function writeOne(key, value) {
  return new Promise((resolve, reject) => {
    connDO.writeItems(key, !!value, (err) => {
      if (err) return reject(new Error(normalizeErr(err)));
      resolve(true);
    });
  });
}

function writeAll(turnOn) {
  return RELAY_KEYS.reduce((p, k) => p.then(() => writeOne(k, turnOn)), Promise.resolve());
}

/* ================== SYS PULSE ================== */
async function pulseM0Once() {
  try {
    connSYS.writeItems("M0.0", true, () => {
      setTimeout(() => connSYS.writeItems("M0.0", false, () => {}), 200);
    });
  } catch (e) {
    console.warn("[PLC SYS] pulse error:", e.message);
  }
}
setInterval(pulseM0Once, HEARTBEAT_MS);

/* ================== RS485 (MB4/MD6/MB5) ================== */
function readRS485() {
  return new Promise((resolve, reject) => {
    try {
      try { connAI.addItems(RS_TAGS); } catch (_) {}
      connAI.readAllItems((err, vals) => {
        if (err) return reject(new Error(normalizeErr(err)));
        if (!vals) return resolve({ address: 0, baud: 0, parity: 0 });
        const address = dByte(vals["MB4"]);
        const baud    = dDWord(vals["MD6"]);
        const parity  = dByte(vals["MB5"]);
        resolve({ address, baud, parity });
      });
    } catch (e) {
      reject(e);
    }
  });
}

function writeRS485({ address, baud, parity }) {
  return new Promise((resolve, reject) => {
    try {
      try { connAI.addItems(RS_TAGS); } catch (_) {}

      const addrVal = Number(address) & 0xFF;   // MB4
      const baudVal = Number(baud)   >>> 0;     // MD6 (DWord)

      let p = parity;
      if (typeof p === "string") {
        const s = p.toLowerCase();
        p = s === "none" ? 0 : s === "odd" ? 1 : s === "even" ? 2 : Number(p);
      }
      const parityVal = Number(p) & 0xFF;       // MB5

      // Ghi tuần tự để dễ debug
      connAI.writeItems("MB4", addrVal, (e1) => {
        if (e1) return reject(new Error(normalizeErr(e1)));
        connAI.writeItems("MD6", baudVal, (e2) => {
          if (e2) return reject(new Error(normalizeErr(e2)));
          connAI.writeItems("MB5", parityVal, (e3) => {
            if (e3) return reject(new Error(normalizeErr(e3)));
            resolve(true);
          });
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

/* ================== RECONNECT SUPPORT ================== */
function refreshAnalogConn() {
  try {
    // nodes7 không expose close chính thức; cách thường dùng là tạo connection mới.
    // Ở đây ta log để biết nhịp reconnect; lần sau tick lỗi nó sẽ tự connectOne lại.
    console.warn("[PLC AI] refreshAnalogConn requested");
    // Có thể bổ sung logic nâng cao tùy env thực tế.
  } catch (e) {
    console.error("[PLC AI] refresh failed:", e.message);
  }
}

/* ================== EXPORT ================== */
module.exports = {
  ensureKey: async (key) => {
    if (!RELAY_MAP[key]) throw new Error(`UNKNOWN_RELAY:${key}`);
  },
  readRelays,
  readAll: readRelays,
  readInputs,
  readAnalogs,
  readAnalogsFixed,
  writeOne,
  writeAll,
  pulseM0Once,
  readRS485,
  writeRS485,
  refreshAnalogConn,
  RELAY_MAP,
  INPUT_MAP,
  __config: {
    PLC_IP,
    PLC_RACK,
    PLC_SLOT,
    AI_ADDRS_DEFAULT,
    FIXED_ADDRS,
    AI_RAW_MAX,
    HEARTBEAT_MS,
  },
};
