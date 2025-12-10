// server/src/controllers/sensorController.js
const SensorReading = require('../models/SensorReading');
const AiChannelConfig = require('../models/AiChannelConfig');
const plc = require('../services/plc.service');

/* ============================================================
 * HELPERS
 * ============================================================ */
function startEndOfDay(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function getCurrentByMetric(metric) {
  return SensorReading.findOne({ metric }).sort({ ts: -1 }).lean();
}

function safeNum(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* ============================================================
 * LẤY MODE CỦA CÁC KÊNH TỪ DB
 * ============================================================ */
async function getChannelModes() {
  try {
    const cfgs = await AiChannelConfig.find({ enabled: true })
      .sort({ index: 1 })
      .lean();
    const map = {};
    for (const c of cfgs) {
      map[c.index] = (c.mode || 'AI').toUpperCase();
    }
    return map;
  } catch (_) {
    return { 1: 'AI', 2: 'AI', 3: 'AI', 4: 'AI' };
  }
}

/* ============================================================
 * API: LIVE - GỘP AI & MODBUS
 * ============================================================ */
async function getAiLive(req, res) {
  try {
    const typeFilter = (req.query.type || '').toUpperCase();

    const modes = await getChannelModes();
    let aiData = {};
    let mbData = {};

    try {
      aiData = await plc.readAnalogs();
    } catch (err) {
      console.warn('[getAiLive] readAnalogs error:', err.message);
    }
    try {
      mbData = await plc.readAnalogsFixed();
    } catch (err) {
      console.warn('[getAiLive] readAnalogsFixed error:', err.message);
    }

    const result = {};
    for (let i = 1; i <= 4; i++) {
      const mode = modes[i] || 'AI';
      if (typeFilter && mode !== typeFilter) continue;

      const src = mode === 'MODBUS' ? mbData[`m${i}`] : aiData[`a${i}`];

      result[`ch${i}`] = {
        index: i,
        mode,
        addr:
          src?.addr ||
          (mode === 'MODBUS'
            ? `MW${10 + (i - 1) * 2}`
            : ['MW20', 'MW22', 'MW24', 'MW26'][i - 1]),
        raw: safeNum(src?.raw),
        value: safeNum(src?.value),
      };
    }

    res.json({
      ok: true,
      type: typeFilter || 'ALL',
      count: Object.keys(result).length,
      channels: result,
      at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'getAiLive failed' });
  }
}

/* ============================================================
 * API: RAW (AI / MODBUS)
 * ============================================================ */
async function getAiRaw(req, res) {
  try {
    const typeFilter = (req.query.type || '').toUpperCase();
    const modes = await getChannelModes();

    let aiData = {};
    let mbData = {};
    try {
      aiData = await plc.readAnalogs();
    } catch (err) {
      console.warn('[getAiRaw] readAnalogs error:', err.message);
    }
    try {
      mbData = await plc.readAnalogsFixed();
    } catch (err) {
      console.warn('[getAiRaw] readAnalogsFixed error:', err.message);
    }

    const raws = {};
    for (let i = 1; i <= 4; i++) {
      const mode = modes[i] || 'AI';
      if (typeFilter && mode !== typeFilter) continue;

      const src = mode === 'MODBUS' ? mbData[`m${i}`] : aiData[`a${i}`];
      raws[`ch${i}`] = safeNum(src?.raw);
    }

    res.json({
      ok: true,
      type: typeFilter || 'ALL',
      raws,
      rawMax: plc.__config?.AI_RAW_MAX ?? 32000,
      at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'getAiRaw failed' });
  }
}

/* ============================================================
 * API: LẤY GIÁ TRỊ LIVE HOẶC DB
 * ============================================================ */
async function getLast(req, res) {
  try {
    const source = String(req.query.source || '').toLowerCase();
    const n2 = (x) =>
      Number.isFinite(Number(x)) ? Number(Number(x).toFixed(2)) : null;

    if (source === 'live') {
      const live = await getAiLive({ query: {} }, { json: (x) => x });
      const ch = live.channels || {};

      return res.json({
        temp: n2(ch?.ch1?.value),
        humidity: n2(ch?.ch2?.value),
        pressure_filter: n2(ch?.ch3?.value),
        pressure_room: n2(ch?.ch4?.value),
        raw: {
          ch1: ch?.ch1?.raw ?? null,
          ch2: ch?.ch2?.raw ?? null,
          ch3: ch?.ch3?.raw ?? null,
          ch4: ch?.ch4?.raw ?? null,
        },
        source: 'live',
        at: new Date().toISOString(),
      });
    }

    // --- DB fallback ---
    const [t, h, pf, pr] = await Promise.all([
      getCurrentByMetric('temp'),
      getCurrentByMetric('humidity'),
      getCurrentByMetric('pressure_filter'),
      getCurrentByMetric('pressure_room'),
    ]);

    const ts =
      (t?.ts || h?.ts || pf?.ts || pr?.ts || new Date()).toISOString();
    res.json({
      temp: t ? Number(t.value) : null,
      humidity: h ? Number(h.value) : null,
      pressure_filter: pf ? Number(pf.value) : null,
      pressure_room: pr ? Number(pr.value) : null,
      at: ts,
      source: 'db',
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'getLast failed' });
  }
}

/* ============================================================
 * NHIỆT ĐỘ / ĐỘ ẨM
 * ============================================================ */
async function getTemperature(req, res) {
  try {
    const cur = await getCurrentByMetric('temp');
    res.json(cur ? Number(cur.value) : null);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getTemperature failed' });
  }
}

async function getHumidity(req, res) {
  try {
    const cur = await getCurrentByMetric('humidity');
    res.json(cur ? Number(cur.value) : null);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getHumidity failed' });
  }
}

/* ============================================================
 * ÁP SUẤT
 * ============================================================ */
async function getFilterPressure(req, res) {
  try {
    const cur = await getCurrentByMetric('pressure_filter');
    res.json(cur ? Number(cur.value) : null);
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message || 'getFilterPressure failed' });
  }
}

async function getRoomPressure(req, res) {
  try {
    const cur = await getCurrentByMetric('pressure_room');
    res.json(cur ? Number(cur.value) : null);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getRoomPressure failed' });
  }
}

/* ============================================================
 * LỊCH SỬ / AGGREGATE
 * ============================================================ */
function parseRangeFromQuery(q) {
  let from, to;
  if (q.from) from = new Date(q.from);
  if (q.to) to = new Date(q.to);
  if (!from || !to || isNaN(from) || isNaN(to)) {
    const { start, end } = startEndOfDay();
    from = start;
    to = end;
  }
  return { from, to };
}

async function aggregateMetric(metric, { from, to }, bucketSec) {
  const match = { metric, ts: { $gte: from, $lte: to } };
  const pipeline = [
    { $match: match },
    {
      $addFields: {
        bucket: {
          $dateTrunc: {
            date: '$ts',
            unit: 'second',
            binSize: bucketSec || 5,
          },
        },
      },
    },
    { $group: { _id: '$bucket', v: { $avg: '$value' } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, t: '$_id', v: { $round: ['$v', 2] } } },
  ];
  return await SensorReading.aggregate(pipeline);
}

async function getHistory(req, res) {
  try {
    const metric = (req.query.metric || 'temp').toLowerCase();
    const { from, to } = parseRangeFromQuery(req.query);
    const points = await aggregateMetric(
      metric,
      { from, to },
      Number(req.query.bucketSec || 5)
    );
    res.json({ metric, points });
  } catch (e) {
    res.status(500).json({ error: e.message || 'getHistory failed' });
  }
}

/* ============================================================
 * ÁP SUẤT - HISTORY (COMPAT)
 * ============================================================ */
function dayRange(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

async function getHistoryOneDay(metric, dateStr) {
  const { start, end } = dayRange(dateStr);
  const rows = await SensorReading.find({
    metric,
    ts: { $gte: start, $lte: end },
  })
    .sort({ ts: 1 })
    .select({ _id: 0, value: 1, ts: 1 })
    .lean();
  return rows.map((r) => ({ t: r.ts, v: Number(r.value) }));
}

async function getFilterPressureHistory(req, res) {
  try {
    const rows = await getHistoryOneDay('pressure_filter', req.query.date);
    res.json(rows);
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message || 'getFilterPressureHistory failed' });
  }
}

async function getRoomPressureHistory(req, res) {
  try {
    const rows = await getHistoryOneDay('pressure_room', req.query.date);
    res.json(rows);
  } catch (e) {
    res
      .status(500)
      .json({ error: e.message || 'getRoomPressureHistory failed' });
  }
}

/* ============================================================ */
module.exports = {
  // LIVE
  getAiLive,
  getAiRaw,
  getLast,

  // Temperature / Humidity
  getTemperature,
  getHumidity,

  // Pressure
  getFilterPressure,
  getRoomPressure,
  getFilterPressureHistory,
  getRoomPressureHistory,

  // History
  getHistory,
};
