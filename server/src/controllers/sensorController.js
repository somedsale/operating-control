// server/src/controllers/sensorController.js
const SensorReading = require('../models/SensorReading');

/** Helper: lấy đầu/cuối ngày (theo timezone server) */
function startEndOfDay(d = new Date()) {
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Helper: current value theo metric (trả về document hoặc null) */
async function getCurrentByMetric(metric) {
  const doc = await SensorReading.findOne({ metric }).sort({ ts: -1 }).lean();
  return doc || null;
}

/** GET /api/sensor/temp  -> trả về số (UI hiện tại kỳ vọng số thô) */
async function getTemperature(req, res) {
  try {
    const cur = await getCurrentByMetric('temp');
    return res.json(cur ? Number(cur.value) : 0);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'getTemperature failed' });
  }
}

/** GET /api/sensor/humidity -> trả về số */
async function getHumidity(req, res) {
  try {
    const cur = await getCurrentByMetric('humidity');
    return res.json(cur ? Number(cur.value) : 0);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'getHumidity failed' });
  }
}

/**
 * GET /api/sensor/last
 * -> { temp: number, humidity: number, pressure_filter?: number, pressure_room?: number, at: ISOString }
 */
async function getLast(req, res) {
  try {
    const [t, h, pf, pr] = await Promise.all([
      getCurrentByMetric('temp'),
      getCurrentByMetric('humidity'),
      getCurrentByMetric('pressure_filter'),
      getCurrentByMetric('pressure_room'),
    ]);
    return res.json({
      temp: t ? Number(t.value) : 0,
      humidity: h ? Number(h.value) : 0,
      pressure_filter: pf ? Number(pf.value) : undefined,
      pressure_room:   pr ? Number(pr.value) : undefined,
      at: (t?.ts || h?.ts || pf?.ts || pr?.ts || new Date()).toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'getLast failed' });
  }
}

/** Helper: parse range from query (?from=&to=) hoặc mặc định day-of */
function parseRangeFromQuery(q) {
  let from, to;
  if (q.from) from = new Date(q.from);
  if (q.to)   to   = new Date(q.to);
  if (!from || !to || isNaN(from) || isNaN(to)) {
    const { start, end } = startEndOfDay(new Date());
    from = start; to = end;
  }
  return { from, to };
}

/** Helper: gom theo bucketSec (giây). bucketSec<=1 => trả raw */
async function aggregateMetric(metric, { from, to }, bucketSec) {
  const match = { metric, ts: { $gte: from, $lte: to } };

  if (!bucketSec || bucketSec <= 1) {
    const docs = await SensorReading.find(match, { _id: 0, value: 1, ts: 1 })
      .sort({ ts: 1 }).lean();
    return docs.map(d => ({ t: d.ts, v: Number(d.value) }));
  }

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        bucket: {
          $dateTrunc: {
            date: '$ts',
            unit: 'second',
            binSize: bucketSec,
          },
        },
      },
    },
    { $group: { _id: '$bucket', v: { $avg: '$value' } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, t: '$_id', v: { $round: ['$v', 2] } } },
  ];
  const rows = await SensorReading.aggregate(pipeline);
  return rows;
}

/**
 * GET /api/sensor/history
 * Query:
 *  - metric = temp|humidity|pressure_filter|pressure_room|all (default=temp)
 *  - from=ISO|yyyy-mm-dd
 *  - to=ISO|yyyy-mm-dd
 *  - bucketSec=number (0/1 = raw)
 *
 * Trả về:
 *  - metric != all: { metric:'temp', points:[{ t, v }] }
 *  - metric == all: { temp:[...], humidity:[...], pressure_filter:[...], pressure_room:[...] }
 */
async function getHistory(req, res) {
  try {
    const metric = (req.query.metric || 'temp').toLowerCase();
    const bucketSec = Math.max(1, Number(req.query.bucketSec || 0)); // 0 => raw
    const { from, to } = parseRangeFromQuery(req.query);

    const valid = ['temp', 'humidity', 'pressure_filter', 'pressure_room', 'all'];

    if (!valid.includes(metric)) {
      return res.status(400).json({ error: 'Invalid metric' });
    }

    if (metric === 'all') {
      const [temp, humidity, pressure_filter, pressure_room] = await Promise.all([
        aggregateMetric('temp', { from, to }, bucketSec),
        aggregateMetric('humidity', { from, to }, bucketSec),
        aggregateMetric('pressure_filter', { from, to }, bucketSec),
        aggregateMetric('pressure_room', { from, to }, bucketSec),
      ]);
      return res.json({ temp, humidity, pressure_filter, pressure_room });
    } else {
      const points = await aggregateMetric(metric, { from, to }, bucketSec);
      return res.json({ metric, points });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'getHistory failed' });
  }
}

/* ------- PRESSURE: current (giữ endpoint cũ, nhưng dùng metric) ------- */
const getFilterPressure = async (req, res) => {
  try {
    const cur = await getCurrentByMetric('pressure_filter');
    res.json(cur ? Number(cur.value) : 0);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getFilterPressure failed' });
  }
};

const getRoomPressure = async (req, res) => {
  try {
    const cur = await getCurrentByMetric('pressure_room');
    res.json(cur ? Number(cur.value) : 0);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getRoomPressure failed' });
  }
};

/* ------- PRESSURE: history in day (giữ endpoint cũ, dùng metric) ------- */
function dayRange(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}
async function getHistoryOneDay(metric, dateStr) {
  const { start, end } = dayRange(dateStr);
  return SensorReading
    .find({ metric, ts: { $gte: start, $lte: end } })
    .sort({ ts: 1 })
    .select({ _id: 0, value: 1, ts: 1 })
    .lean()
    .then(rows => rows.map(r => ({ t: r.ts, v: Number(r.value) })));
}

const getFilterPressureHistory = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD (optional -> today)
    const rows = await getHistoryOneDay('pressure_filter', date);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getFilterPressureHistory failed' });
  }
};

const getRoomPressureHistory = async (req, res) => {
  try {
    const { date } = req.query;
    const rows = await getHistoryOneDay('pressure_room', date);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message || 'getRoomPressureHistory failed' });
  }
};

module.exports = {
  getTemperature,
  getHumidity,
  getLast,
  getHistory,

  // pressure (compat)
  getFilterPressure,
  getRoomPressure,
  getFilterPressureHistory,
  getRoomPressureHistory,
};
