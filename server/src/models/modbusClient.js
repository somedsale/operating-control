// server/src/models/modbusClient.js
const ModbusRTU = require('modbus-serial');
const cfg = require('../../config/env');

// ==== ENV / Tuning ====
const MODBUS_TIMEOUT_MS   = Number(process.env.MODBUS_TIMEOUT_MS   || 4000);
const HEARTBEAT_MS        = Number(process.env.HEARTBEAT_MS        || 5000);
const WRITE_MIN_GAP_MS    = Number(process.env.WRITE_MIN_GAP_MS    || 120);
// Nên để heartbeat đọc Holding 40001 (offset 0) vì thường luôn hợp lệ
const HEARTBEAT_ADDR_HR   = Number(process.env.HEARTBEAT_ADDR_HR   || 0);

const client = new ModbusRTU();

/* ======================================
   State / queue lock / throttle / backoff
   ====================================== */
let connected  = false;
let chain      = Promise.resolve(); // tuần tự hoá mọi lệnh Modbus
let lastWriteMs = 0;
let backoffMs   = 500;              // 0.5s -> 1s -> 2s ... tới 10s
let hbTimer     = null;

function enqueue(task) {
  const run = chain.then(task, task);
  chain = run.catch(() => {});      // giữ chuỗi kể cả khi lỗi
  return run;
}

/* =========================
   Connect / reconnect logic
   ========================= */
async function open() {
  if (client.isOpen) return;
  await client.connectTCP(cfg.PLC_IP, { port: cfg.PLC_PORT || 502, timeout: MODBUS_TIMEOUT_MS });
  client.setID(cfg.UNIT_ID || 1);
  client.setTimeout(MODBUS_TIMEOUT_MS);
  connected = true;
  backoffMs = 500;
  console.log(`[Modbus] Connected ${cfg.PLC_IP}:${cfg.PLC_PORT || 502} (Unit ${cfg.UNIT_ID || 1})`);
}

async function close() {
  try { if (client.isOpen) client.close(); } catch {}
  connected = false;
  console.log('[Modbus] Closed');
}

async function ensure() {
  if (!connected || !client.isOpen) await open();
}

async function safeReconnect() {
  await close();
  await new Promise(r => setTimeout(r, backoffMs));
  try {
    await open();
  } catch (e) {
    backoffMs = Math.min(backoffMs * 2, 10000);
    throw e;
  }
}

client.on('close', () => { connected = false; console.warn('[Modbus] Socket closed'); });
client.on('error', (e) => { connected = false; console.warn('[Modbus] Error:', e?.message || e); });

// Heartbeat giữ socket “ấm” và tự reconnect mềm khi ping fail
function startHeartbeat() {
  if (hbTimer) return;
  hbTimer = setInterval(() => {
    enqueue(async () => {
      try {
        await ensure();
        await client.readHoldingRegisters(HEARTBEAT_ADDR_HR, 1); // 40001
      } catch (e) {
        console.warn('[HB] ping failed:', e?.message || e);
        try { await safeReconnect(); } catch {}
      }
    });
  }, HEARTBEAT_MS);
}

/* ================
   DO (Coils) core
   ================ */
/**
 * LƯU Ý cho S7-200 SMART:
 * Thông thường map 00001.. vào %M0.0.. và trong ladder gán Q := M
 * (vd Q0.0 := M0.0). Khi đó writeCoil(0,true) sẽ bật Q0.0 qua M0.0.
 */
async function readDOStatesCore() {
  await ensure();
  const res = await client.readCoils(0, 4);        // 00001..00004 -> M0.0..M0.3
  return res.data.map(Boolean);                    // [bool,bool,bool,bool]
}

async function writeCoilCore(index, state) {
  const now = Date.now();
  const lag = now - lastWriteMs;
  if (lag < WRITE_MIN_GAP_MS) await new Promise(r => setTimeout(r, WRITE_MIN_GAP_MS - lag));
  await ensure();
  await client.writeCoil(index, !!state);
  lastWriteMs = Date.now();
}

/* ===============
   AI (IR) core
   =============== */
const AI_CHANNELS = {
  AI0: { ir: 0, iw: 64, rawMin: 0, rawMax: 27648, engMin: 0,   engMax: 10   }, // 0..10V
  AI1: { ir: 1, iw: 66, rawMin: 0, rawMax: 27648, engMin: 0,   engMax: 10   },
  AI2: { ir: 2, iw: 68, rawMin: 0, rawMax: 27648, engMin: 0,   engMax: 1000 }, // ví dụ Pa
  AI3: { ir: 3, iw: 70, rawMin: 0, rawMax: 27648, engMin: 0,   engMax: 1000 },
};

async function readAIBlockCore(start, count) {
  await ensure();
  const res = await client.readInputRegisters(start, count); // 30001 + start
  return res.data;
}

function scaleRaw(value, rawMin, rawMax, engMin, engMax) {
  const v = Number(value);
  if (!Number.isFinite(v)) return NaN;
  const clamped = Math.max(rawMin, Math.min(rawMax, v));
  const ratio = (clamped - rawMin) / (rawMax - rawMin);
  return engMin + ratio * (engMax - engMin);
}

function irFromIW(baseIW, iw) { return Math.floor((iw - baseIW) / 2); }

/* ==========================
   DI (Discrete Inputs) core
   ========================== */
async function readDICore(start, count) {
  await ensure();
  const res = await client.readDiscreteInputs(start, count); // 10001 + start
  return res.data.map(Boolean);
}

/* ==========================
   Public API exports
   ========================== */
module.exports = {
  /* ---- Connection / health ---- */
  health: () => ({ connected }),
  withLock: enqueue,

  async init() {
    try { await open(); } catch (e) { console.warn('Initial connect failed:', e?.message || e); }
    startHeartbeat();
  },

  async reset() {
    return enqueue(async () => {
      await safeReconnect();
      return { ok: true };
    });
  },

  /* ---- DO (Q0.0..Q0.3 qua M0.0..M0.3) ---- */
  async getDOStates() { return enqueue(readDOStatesCore); },

  async setDO(index, state) {
    if (index < 0 || index > 3) throw new Error('DO index must be 0..3');
    return enqueue(async () => {
      await writeCoilCore(index, state);
      return readDOStatesCore();
    });
  },

  async toggleDO(index) {
    if (index < 0 || index > 3) throw new Error('DO index must be 0..3');
    return enqueue(async () => {
      const s = await readDOStatesCore();
      await writeCoilCore(index, !s[index]);
      return readDOStatesCore();
    });
  },

  // Ghi batch tối ưu bằng FC 0x0F (viết nhiều coils) nếu lib hỗ trợ
  async batchDO(states) {
    if (!Array.isArray(states) || states.length !== 4)
      throw new Error('states must be array[4] of boolean');
    return enqueue(async () => {
      await ensure();
      const now = Date.now();
      const lag = now - lastWriteMs;
      if (lag < WRITE_MIN_GAP_MS) await new Promise(r => setTimeout(r, WRITE_MIN_GAP_MS - lag));
      // modbus-serial hỗ trợ writeCoils(address, array<bool>)
      await client.writeCoils(0, states.map(Boolean));
      lastWriteMs = Date.now();
      return readDOStatesCore();
    });
  },

  /* ---- AI (Input Registers) ---- */
  async getAI(start = 0, count = 4) {
    if (start < 0 || count <= 0) throw new Error('start/count invalid');
    return enqueue(() => readAIBlockCore(start, count));
  },

  async getAIScaled(channels = []) {
    if (!Array.isArray(channels) || channels.length === 0) return [];
    return enqueue(async () => {
      const out = [];
      for (const ch of channels) {
        const { addr, rawMin = 0, rawMax = 27648, engMin = 0, engMax = 10 } = ch || {};
        const [raw] = await readAIBlockCore(addr, 1);
        const eng = scaleRaw(raw, rawMin, rawMax, engMin, engMax);
        out.push({ raw, eng });
      }
      return out;
    });
  },

  async getAIByName(name) {
    const ch = AI_CHANNELS[name];
    if (!ch) throw new Error(`Unknown AI channel: ${name}`);
    return enqueue(async () => {
      const [raw] = await readAIBlockCore(ch.ir, 1);
      const eng = scaleRaw(raw, ch.rawMin, ch.rawMax, ch.engMin, ch.engMax);
      return { name, raw, eng, ir: ch.ir, iw: ch.iw };
    });
  },

  async getAIMany(names = ['AI0','AI1','AI2','AI3']) {
    return enqueue(async () => {
      const out = {};
      for (const n of names) {
        const ch = AI_CHANNELS[n];
        if (!ch) throw new Error(`Unknown AI channel: ${n}`);
        const [raw] = await readAIBlockCore(ch.ir, 1);
        const eng = scaleRaw(raw, ch.rawMin, ch.rawMax, ch.engMin, ch.engMax);
        out[n] = { raw, eng, ir: ch.ir, iw: ch.iw };
      }
      return out;
    });
  },

  /* ---- DI (Discrete Inputs) ---- */
  async getDI(start = 0, count = 8) {
    if (start < 0 || count <= 0) throw new Error('start/count invalid');
    return enqueue(() => readDICore(start, count));
  },

  async getDIByOffsets(offsets = []) {
    if (!Array.isArray(offsets) || offsets.length === 0) return {};
    return enqueue(async () => {
      const min = Math.min(...offsets);
      const max = Math.max(...offsets);
      const block = await readDICore(min, max - min + 1);
      const out = {};
      for (const o of offsets) out[o] = !!block[o - min];
      return out;
    });
  },

  // Helpers
  irFromIW,
  AI_CHANNELS,
};
