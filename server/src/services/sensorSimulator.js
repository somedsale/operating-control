// server/src/services/sensorSimulator.js
const SensorReading = require('../models/SensorReading');

let timer = null;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Random-walk mượt để nhìn biểu đồ đẹp
function nextValue(cur, step, min, max) {
  const jitter = (Math.random() - 0.5) * step * 2; // [-step, step]
  return clamp(cur + jitter, min, max);
}

/**
 * startSensorSimulator(options):
 *  - intervalMs: mặc định 5000ms
 *  - initTemp: 24.0 (°C), initHumidity: 50 (%)
 *  - rangeTemp: [22, 27], rangeHumidity: [40, 65]
 *  - stepTemp: 0.15, stepHumidity: 0.8
 */
function startSensorSimulator(opts = {}) {
  const {
    intervalMs = 5000,
    initTemp = 24.0,
    initHumidity = 50.0,
    rangeTemp = [22, 27],
    rangeHumidity = [40, 65],
    stepTemp = 0.15,
    stepHumidity = 0.8,
    enabled = (process.env.SIMULATE_SENSORS ?? 'true') !== 'false',
  } = opts;

  if (!enabled) {
    console.log('[sensorSimulator] disabled (SIMULATE_SENSORS=false)');
    return;
  }
  if (timer) return; // tránh start nhiều lần

  let curTemp = initTemp;
  let curHumd = initHumidity;

  console.log(`[sensorSimulator] start every ${intervalMs}ms`);

  timer = setInterval(async () => {
    try {
      curTemp = nextValue(curTemp, stepTemp, rangeTemp[0], rangeTemp[1]);
      curHumd = nextValue(curHumd, stepHumidity, rangeHumidity[0], rangeHumidity[1]);

      const now = new Date();

      await SensorReading.insertMany([
        { metric: 'temp',     value: Number(curTemp.toFixed(2)), unit: '°C', ts: now },
        { metric: 'humidity', value: Number(curHumd.toFixed(2)), unit: '%',  ts: now },
      ]);
    } catch (e) {
      console.error('[sensorSimulator] insert error:', e?.message || e);
    }
  }, intervalMs);
}

function stopSensorSimulator() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[sensorSimulator] stopped');
  }
}

module.exports = { startSensorSimulator, stopSensorSimulator };
