// server/src/services/sensorService.js
const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');
const plc = require('./plc.service');

// aiConfig guard
let aiCfg = null;
try {
  aiCfg = require('./aiConfig.service');
  if (aiCfg && aiCfg.default) aiCfg = aiCfg.default;
} catch (_) {
  aiCfg = null;
}

let timer = null;
let ticking = false;

/* ================== Helpers ================== */
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function isFiniteNumber(n) { return typeof n === 'number' && Number.isFinite(n); }

function scaleRaw(value, rawMin, rawMax, engMin, engMax) {
  const v = Number(value);
  if (!Number.isFinite(v)) return NaN;
  const span = Math.max(1, rawMax - rawMin);
  const r = clamp((v - rawMin) / span, 0, 1);
  return engMin + r * (engMax - engMin);
}

async function waitDbReady(timeoutMs = 10000) {
  const started = Date.now();
  for (;;) {
    const rs = mongoose.connection?.readyState;
    if (rs === 1) return true;
    if (Date.now() - started > timeoutMs)
      throw new Error(`Mongo not ready after ${timeoutMs}ms (readyState=${rs})`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function safeInsertMany(docs) {
  if (!docs?.length) return { ok: 0, nInserted: 0 };
  try {
    const res = await SensorReading.insertMany(docs, {
      ordered: false, rawResult: false, maxTimeMS: 2000,
    });
    return { ok: 1, nInserted: Array.isArray(res) ? res.length : 0 };
  } catch (e) {
    console.error('[plcSensor] insertMany error:', e?.name, e?.code, e?.message);
    if (Array.isArray(e?.writeErrors)) {
      e.writeErrors.forEach((we, i) =>
        console.error(`  writeError[${i}]:`, we?.code, we?.errmsg || we?.message)
      );
    }
    let ok = 0;
    for (const d of docs) {
      try { await SensorReading.create(d); ok++; }
      catch (e1) { console.error('[plcSensor] create item error:', e1?.message, '| doc=', d); }
    }
    return { ok: ok > 0 ? 1 : 0, nInserted: ok };
  }
}

const METRIC_MAP = {
  temp: 'temperature',
  temperature: 'temperature',
  humidity: 'humidity',
  pressure_filter: 'pressure_filter',
  pressure_room: 'pressure_room',
};

async function readAnalogsWithRetry(tries = 2, delayMs = 300) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await plc.readAnalogs(); }
    catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function readAnalogsSafe(timeoutMs = 3000) {
  return Promise.race([
    readAnalogsWithRetry(2, 300),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`PLC read timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function keyToIndex1(key) {
  const m = /^a(\d+)$/i.exec(key || '');
  return m ? Number(m[1]) : null;
}

/* ================== MAIN ================== */
async function startPlcSensor(opts = {}) {
  const {
    intervalMs = Number(process.env.PLC_POLL_MS || 2000),
    enabled = (process.env.SIMULATE_SENSORS ?? 'true') !== 'false',
    channels = [
      { key: 'a1', metric: 'temp' },
      { key: 'a2', metric: 'humidity' },
      { key: 'a3', metric: 'pressure_filter' },
      { key: 'a4', metric: 'pressure_room' },
    ],
    defaultScale = {
      rawMin: 0,
      rawMax: Number(plc.__config?.AI_RAW_MAX ?? 27648),
      engMin: 0,
      engMax: 100,
    },
  } = opts;

  if (!enabled) {
    console.log('[plcSensor] disabled (SIMULATE_SENSORS=false)');
    return;
  }
  if (timer) return;

  try { await waitDbReady(15000); }
  catch (e) { console.error('[plcSensor] Mongo not ready at start:', e?.message || e); }

  try {
    if (aiCfg && typeof aiCfg.initAndApply === 'function') {
      await aiCfg.initAndApply();
    } else {
      console.warn('[plcSensor] aiCfg.initAndApply not available, skip');
    }
  } catch (e) {
    console.warn('[plcSensor] aiCfg.initAndApply warning:', e?.message || e);
  }

  console.log(
    `[plcSensor] start every ${intervalMs}ms | channels=${channels.map(c => `${c.key}:${METRIC_MAP[c.metric] || c.metric}`).join(', ')}`
  );

  /* ====== MAIN LOOP ====== */
  timer = setInterval(async () => {
    if (ticking) {
      console.warn('[plcSensor] skip tick (busy)');
      return;
    }

    ticking = true;
    const watchdog = setTimeout(() => {
      console.error('[plcSensor] watchdog forced unlock after 10s]');
      ticking = false;
    }, 10000);

    console.time('[plcSensor] tick');
    try {
      if (mongoose.connection?.readyState !== 1) {
        await waitDbReady(5000);
        if (mongoose.connection?.readyState !== 1) {
          console.warn('[plcSensor] Mongo not ready, skip tick');
          return;
        }
      }

      const analogs = await readAnalogsSafe(3000);
      const now = new Date();

      const docsRaw = await Promise.all(
        channels.map(async (ch) => {
          const d = analogs[ch.key];
          if (!d) return null;
          const idx1 = keyToIndex1(ch.key);
          if (!idx1) return null;

          // --- xác định mode (AI / MODBUS) ---
          let source = d.mode?.toUpperCase?.() || 'AI';
          try {
            if (aiCfg && typeof aiCfg.getChannel === 'function') {
              const dbCfg = await aiCfg.getChannel(idx1);
              if (dbCfg && String(dbCfg.mode).toUpperCase() === 'MODBUS')
                source = 'MODBUS';
            } else if (typeof plc.getChannelConfig === 'function') {
              const plcCfg = plc.getChannelConfig(idx1);
              if (plcCfg && String(plcCfg.mode).toUpperCase() === 'MODBUS')
                source = 'MODBUS';
            }
          } catch (_) {}

          // --- tính toán giá trị ---
          let value = null;
          if (source === 'MODBUS') {
            // d.raw bây giờ là signed từ plc.readAnalogs() -> -71/10 = -7.1 ✔
            value = isFiniteNumber(d.raw) ? d.raw / 10 : null;
          } else if (isFiniteNumber(d.value)) {
            // d.value = % từ rawU (0..27648)
            value = d.value;
          } else if (isFiniteNumber(d.rawU)) {
            // fallback: scale theo rawU nếu cần
            value = scaleRaw(d.rawU, defaultScale.rawMin, defaultScale.rawMax,
                             defaultScale.engMin, defaultScale.engMax);
          }

          const metric = METRIC_MAP[ch.metric] || ch.metric;
          const value2 = isFiniteNumber(value) ? Number(value.toFixed(2)) : null;
          return value2 == null ? null : { metric, value: value2, ts: now, source };
        })
      );

      const docs = docsRaw.filter(
        (d) => d && typeof d.metric === 'string' &&
               isFiniteNumber(d.value) && typeof d.source === 'string'
      );

      if (!docs.length) console.warn('[plcSensor] no valid docs to insert');
      else {
        const res = await safeInsertMany(docs);
        if (res.ok)
          console.log(`[plcSensor] tick OK (${res.nInserted} readings)`);
        else console.error('[plcSensor] insert fallback only');
      }

    } catch (e) {
      console.error('[plcSensor] read/insert error:', e?.message || e);

      if (/PLC read timeout|NOT_CONNECTED|COMM|CLOSED/i.test(e?.message || '')) {
        try {
          console.warn('[plcSensor] attempting PLC reconnect...');
          if (typeof plc.refreshAnalogConn === 'function') plc.refreshAnalogConn();
        } catch (err2) {
          console.error('[plcSensor] reconnect attempt failed:', err2?.message || err2);
        }
      }

    } finally {
      clearTimeout(watchdog);
      ticking = false;
      console.timeEnd('[plcSensor] tick');
    }
  }, intervalMs);
}

function stopPlcSensor() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[plcSensor] stopped');
  }
}

/* ============================================================
   AISyncFixed — đọc 4 kênh MW10, MW12, MW14, MW16 (signed/10)
   ============================================================ */
let timerFixed = null;
let tickingFixed = false;

async function startAISyncFixed(opts = {}) {
  const {
    intervalMs = Number(process.env.AI_FIXED_POLL_MS || 3000),
    enabled = (process.env.AI_FIXED_ENABLED ?? 'true') !== 'false',
    metrics = ['ai_fixed_1', 'ai_fixed_2', 'ai_fixed_3', 'ai_fixed_4'],
  } = opts;

  if (!enabled) {
    console.log('[AISyncFixed] disabled (AI_FIXED_ENABLED=false)');
    return;
  }
  if (timerFixed) return;

  try { await waitDbReady(10000); }
  catch (e) { console.error('[AISyncFixed] Mongo not ready at start:', e?.message || e); }

  console.log(`[AISyncFixed] start every ${intervalMs}ms | metrics=${metrics.join(', ')}`);

  timerFixed = setInterval(async () => {
    if (tickingFixed) {
      console.warn('[AISyncFixed] skip tick (busy)');
      return;
    }
    tickingFixed = true;
    const watchdog = setTimeout(() => {
      console.error('[AISyncFixed] watchdog forced unlock after 10s');
      tickingFixed = false;
    }, 10000);

    console.time('[AISyncFixed] tick');
    try {
      if (mongoose.connection?.readyState !== 1) {
        await waitDbReady(5000);
        if (mongoose.connection?.readyState !== 1) {
          console.warn('[AISyncFixed] Mongo not ready, skip tick');
          return;
        }
      }

      const fixed = await plc.readAnalogsFixed();
      const now = new Date();

      const docs = metrics.map((metric, i) => {
        const key = `m${i + 1}`;
        const d = fixed[key];
        if (!d || typeof d.value !== 'number') return null;
        return { metric, value: Number(d.value.toFixed(2)), ts: now, source: 'AI_FIXED' };
      }).filter(Boolean);

      if (!docs.length) {
        console.warn('[AISyncFixed] no valid docs to insert');
      } else {
        const res = await safeInsertMany(docs);
        if (res.ok)
          console.log(`[AISyncFixed] tick OK (${res.nInserted} readings)`);
        else
          console.error('[AISyncFixed] insert fallback only');
      }

    } catch (e) {
      console.error('[AISyncFixed] read/insert error:', e?.message || e);
      if (/PLC read timeout|NOT_CONNECTED|COMM|CLOSED/i.test(e?.message || '')) {
        try {
          console.warn('[AISyncFixed] attempting PLC reconnect...');
          if (typeof plc.refreshAnalogConn === 'function') plc.refreshAnalogConn();
        } catch (err2) {
          console.error('[AISyncFixed] reconnect attempt failed:', err2?.message || err2);
        }
      }
    } finally {
      clearTimeout(watchdog);
      tickingFixed = false;
      console.timeEnd('[AISyncFixed] tick');
    }
  }, intervalMs);
}

function stopAISyncFixed() {
  if (timerFixed) {
    clearInterval(timerFixed);
    timerFixed = null;
    console.log('[AISyncFixed] stopped');
  }
}

module.exports = {
  startPlcSensor,
  stopPlcSensor,
  startAISyncFixed,
  stopAISyncFixed,
};
