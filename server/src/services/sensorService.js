// server/src/services/sensorSimulator.js
// Đọc 4 kênh AI thật từ PLC (Modbus TCP) và ghi vào SensorReading:
//  AI0 -> temp (°C), AI1 -> humidity (%), AI2 -> pressure_filter (Pa), AI3 -> pressure_room (Pa)

const SensorReading = require('../models/SensorReading');
const ModbusService = require('../models/modbusClient');

let timer = null;
let ticking = false; // tránh chồng tick khi PLC/DB chậm

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// Scale khi KHÔNG dùng eng từ service
function scaleRaw(value, rawMin, rawMax, engMin, engMax) {
  const v = Number(value);
  if (Number.isNaN(v)) return NaN;
  const r = clamp((v - rawMin) / (rawMax - rawMin), 0, 1);
  return engMin + r * (engMax - engMin);
}

async function readManyWithRetry(names, tries = 2, delayMs = 250) {
  for (let i = 0; i < tries; i++) {
    try { return await ModbusService.getAIMany(names); }
    catch (e) {
      const msg = String(e?.message || e).toLowerCase();
      if (msg.includes('timed')) { // timeout -> thử reset socket
        try { await ModbusService.reset(); } catch {}
      }
      if (i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function startPlcSensor(opts = {}) {
  const {
    intervalMs = Number(process.env.PLC_POLL_MS || 2000),
    useServiceScale = (process.env.USE_SERVICE_SCALE ?? 'true') !== 'false',
    enabled = (process.env.SIMULATE_SENSORS ?? 'true') !== 'false',
    channels = [
      { name: 'AI0', metric: 'temp',            unit: '°C' },
      { name: 'AI1', metric: 'humidity',        unit: '%'  },
      { name: 'AI2', metric: 'pressure_filter', unit: 'Pa' },
      { name: 'AI3', metric: 'pressure_room',   unit: 'Pa' },
    ],
  } = opts;

  if (!enabled) {
    console.log('[plcSensor] disabled (SIMULATE_SENSORS=false)');
    return;
  }
  if (timer) return; // đã chạy

  // Mở kết nối (service tự reconnect nếu rớt)
  await ModbusService.init();

  const names = channels.map(c => c.name);
  console.log(`[plcSensor] start every ${intervalMs}ms | useServiceScale=${useServiceScale} | channels=${names.join(',')}`);

  timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;

    try {
      const data = await readManyWithRetry(names, 2, 300); // retry nhẹ
      const now = new Date();

      const docs = channels.map(ch => {
        const d = data[ch.name];
        if (!d) throw new Error(`Channel not found: ${ch.name} (kiểm tra AI_CHANNELS & pInputReg)`);

        let value;
        if (useServiceScale) {
          value = d.eng; // eng đã scale theo AI_CHANNELS
        } else if (ch.scale) {
          const { rawMin = 0, rawMax = 27648, engMin = 0, engMax = 10 } = ch.scale;
          value = scaleRaw(d.raw, rawMin, rawMax, engMin, engMax);
        } else {
          value = d.raw;
        }

        return {
          metric: ch.metric,
          value: Number((+value).toFixed(2)),
          unit: ch.unit || '',
          ts: now,
          meta: { channel: ch.name, ir: d.ir, iw: d.iw, raw: d.raw },
        };
      });

      if (docs.length) {
        await SensorReading.insertMany(docs, { ordered: false });
      }
    } catch (e) {
      console.error('[plcSensor] read/insert error:', e?.message || e);
    } finally {
      ticking = false;
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

module.exports = { startPlcSensor, stopPlcSensor };
