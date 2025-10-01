// server/src/models/modbusClient.js
const ModbusRTU = require('modbus-serial');
const cfg = require('../../config/env');

// ==== ENV / Tuning (có thể cấu hình qua .env) ====
const MODBUS_TIMEOUT_MS   = Number(process.env.MODBUS_TIMEOUT_MS || 4000);
const HEARTBEAT_MS        = Number(process.env.MODBUS_HEARTBEAT_MS || 5000);
const WRITE_MIN_GAP_MS    = Number(process.env.WRITE_MIN_GAP_MS || 120);
const HEARTBEAT_ADDR_COIL = Number(process.env.HEARTBEAT_ADDR_COIL || 0);

const client = new ModbusRTU();

/* ======================================
   State / queue lock / throttle / backoff
   ====================================== */
let connected = false;
let chain = Promise.resolve();    // tuần tự hoá mọi lệnh Modbus
let lastWriteMs = 0;
let backoffMs = 500;              // 0.5s -> 1s -> 2s ... tới 10s

function enqueue(task) {
  const run = chain.then(task, task);
  chain = run.catch(() => {});    // giữ chuỗi kể cả khi lỗi
  return run;
}

/* =========================
   Connect / reconnect logic
   ========================= */
async function open() {
  if (client.isOpen) return;
  await client.connectTCP(cfg.PLC_IP, { port: cfg.PLC_PORT });
  client.setID(cfg.UNIT_ID);
  client.setTimeout(MODBUS_TIMEOUT_MS);
  connected = true;
  backoffMs = 500; // reset backoff khi đã nối lại
  console.log(`[Modbus] Connected ${cfg.PLC_IP}:${cfg.PLC_PORT} (Unit ${cfg.UNIT_ID})`);
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
client.on('error', (e) => { connected = false; console.warn('[Modbus] Error:', e.message); });

// Heartbeat giữ socket “ấm” và tự reconnect mềm khi ping fail
setInterval(() => {
  enqueue(async () => {
    try {
      await ensure();
      await client.readCoils(HEARTBEAT_ADDR_COIL, 1);
    } catch (e) {
      console.warn('[HB] ping failed:', e.message || e);
      try { await safeReconnect(); } catch {}
    }
  });
}, HEARTBEAT_MS);

/* ================
   DO (Coils) core
   ================ */
async function readDOStatesCore() {
  await ensure();
  const res = await client.readCoils(0, 4);   // Coil 0..3 ↔ %Q0.0..%Q0.3 (nếu map %QB0)
  return res.data;                             // [bool,bool,bool,bool]
}

async function writeCoilCore(index, state) {
  const now = Date.now();
  const lag = now - lastWriteMs;
  if (lag < WRITE_MIN_GAP_MS) {
    await new Promise(r => setTimeout(r, WRITE_MIN_GAP_MS - lag));
  }
  await ensure();
  await client.writeCoil(index, !!state);
  lastWriteMs = Date.now();
}

/* ===============
   AI (IR) core
   =============== */
// Channel map (chỉnh theo TIA): ir = Input Register offset 0-based; iw chỉ để hiển thị
const AI_CHANNELS = {
  AI0: { ir: 0, iw: 64, rawMin: 0, rawMax: 27648, engMin: 0, engMax: 10 },     // 0..10V
  AI1: { ir: 1, iw: 66, rawMin: 0, rawMax: 27648, engMin: 0, engMax: 10 },
  AI2: { ir: 2, iw: 68, rawMin: 0, rawMax: 27648, engMin: 0, engMax: 1000 },   // ví dụ Pa
  AI3: { ir: 3, iw: 70, rawMin: 0, rawMax: 27648, engMin: 0, engMax: 1000 },
};

// Đọc block Input Registers (3xxxx)
async function readAIBlockCore(start, count) {
  await ensure();
  const res = await client.readInputRegisters(start, count);
  return res.data; // mảng số 16-bit (0..65535)
}

// (tuỳ chọn) nếu AI map sang Holding Registers (4xxxx):
// async function readHRBlockCore(start, count) {
//   await ensure();
//   const res = await client.readHoldingRegisters(start, count);
//   return res.data;
// }

function scaleRaw(value, rawMin, rawMax, engMin, engMax) {
  const v = Number(value);
  if (Number.isNaN(v)) return NaN;
  const clamped = Math.max(rawMin, Math.min(rawMax, v));
  const ratio = (clamped - rawMin) / (rawMax - rawMin);
  return engMin + ratio * (engMax - engMin);
}

// Tính IR offset từ IW khi biết base IW (tiện tra cứu)
function irFromIW(baseIW, iw) { return Math.floor((iw - baseIW) / 2); }

/* ==========================
   DI (Discrete Inputs) core
   ========================== */
async function readDICore(start, count) {
  await ensure();
  const res = await client.readDiscreteInputs(start, count);
  return res.data; // mảng boolean length=count
}

/* ==========================
   Public API exports
   ========================== */
module.exports = {
  /* ---- Connection / health ---- */
  health: () => ({ connected }),
  withLock: enqueue,

  async init() {
    try { await open(); } catch (e) { console.warn('Initial connect failed:', e.message); }
  },

  async reset() {
    return enqueue(async () => {
      await safeReconnect();
      return { ok: true };
    });
  },

  /* ---- DO (Q0.0..Q0.3) ---- */
  async getDOStates() { return enqueue(readDOStatesCore); },

  async setDO(index, state) {
    if (index < 0 || index > 3) throw new Error('DO index must be 0..3');
    return enqueue(async () => {
      await writeCoilCore(index, state);
      return readDOStatesCore();
    });
  },

  async toggleDO(index) {
    if (index < 0 || index > 11) throw new Error('DO index must be 0..3');
    return enqueue(async () => {
      const s = await readDOStatesCore();
      await writeCoilCore(index, !s[index]);
      return readDOStatesCore();
    });
  },

  async batchDO(states) {
    if (!Array.isArray(states) || states.length !== 4)
      throw new Error('states must be array[4] of boolean');
    return enqueue(async () => {
      for (let i = 0; i < 12; i++) {
        await writeCoilCore(i, !!states[i]); // tuần tự để tránh kẹt
      }
      return readDOStatesCore();
    });
  },

  /* ---- AI (Input Registers) ---- */
  /**
   * Đọc block AI thô (IR)
   * @param {number} start 0-based (IR30001 => 0)
   * @param {number} count số lượng IR
   * @returns {Promise<number[]>}
   */
  async getAI(start = 0, count = 4) {
    if (start < 0 || count <= 0) throw new Error('start/count invalid');
    return enqueue(() => readAIBlockCore(start, count));
  },

  /**
   * Đọc AI có scale theo kênh bất kỳ (khi không dùng AI_CHANNELS)
   * @param {{addr:number, rawMin?:number, rawMax?:number, engMin?:number, engMax?:number}[]} channels
   * @returns {Promise<{raw:number, eng:number}[]>}
   */
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

  /**
   * Đọc 1 kênh AI theo tên (AI0/AI1/AI2/AI3)
   */
  async getAIByName(name) {
    const ch = AI_CHANNELS[name];
    if (!ch) throw new Error(`Unknown AI channel: ${name}`);
    return enqueue(async () => {
      const [raw] = await readAIBlockCore(ch.ir, 1);
      const eng = scaleRaw(raw, ch.rawMin, ch.rawMax, ch.engMin, ch.engMax);
      return { name, raw, eng, ir: ch.ir, iw: ch.iw };
    });
  },

  /**
   * Đọc nhiều kênh AI theo tên
   * @param {string[]} names ví dụ ['AI0','AI1','AI2','AI3']
   */
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
  /**
   * Đọc block DI (function 0x02)
   * @param {number} start offset 0-based (bit đầu của block DI đã map)
   * @param {number} count số bit cần đọc
   * @returns {Promise<boolean[]>}
   */
  async getDI(start = 0, count = 8) {
    if (start < 0 || count <= 0) throw new Error('start/count invalid');
    return enqueue(() => readDICore(start, count));
  },

  /**
   * Đọc nhiều bit rời rạc theo offset
   * @param {number[]} offsets danh sách offset (0-based, trong block DI)
   * @returns {Promise<Record<number, boolean>>}
   */
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

  // Helpers export để tiện dùng ngoài
  irFromIW,
  AI_CHANNELS,
};
