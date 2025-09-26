// server/routes/logs.js
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const { randomUUID: _randomUUID } = require("crypto");

const router = express.Router();

// ====== Config & helpers ======
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "..", "data", "logs");
const pad2 = (n) => String(n).padStart(2, "0");
const randomUUID = typeof _randomUUID === "function"
  ? _randomUUID
  : () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function dayKey(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function ensureDir(dir = LOG_DIR) {
  await fs.mkdir(dir, { recursive: true });
}

function parseDateQ(q) {
  if (!q) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
    const [y, m, d] = q.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt.getTime();
  }
  const ms = Date.parse(q);
  return Number.isFinite(ms) ? ms : null;
}

function endOfDay(ms) {
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function toNumber(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function appendLogLine(evt) {
  await ensureDir();
  const key = dayKey(evt.timestamp || Date.now());
  const file = path.join(LOG_DIR, `${key}.jsonl`);
  const line = JSON.stringify(evt) + "\n";
  await fs.appendFile(file, line, "utf8");
}

function validSeverity(s) {
  const x = String(s || "").toLowerCase();
  return ["error", "warning", "info"].includes(x) ? x : "info";
}

function validSource(s) {
  const x = String(s || "").toLowerCase();
  return ["gas", "power"].includes(x) ? x : "gas";
}

async function listFilesBetween(fromMs, toMs) {
  await ensureDir();
  const files = [];
  const DAY = 24 * 60 * 60 * 1000;
  for (
    let t = new Date(new Date(fromMs).setHours(0, 0, 0, 0)).getTime();
    t <= toMs;
    t += DAY
  ) {
    files.push(path.join(LOG_DIR, `${dayKey(t)}.jsonl`));
  }
  return files;
}

async function readLogs({ fromMs, toMs, source, severity, limit, offset }) {
  const files = await listFilesBetween(fromMs, toMs);
  const rows = [];

  for (const f of files) {
    try {
      const text = await fs.readFile(f, "utf8");
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        if (obj.timestamp < fromMs || obj.timestamp > toMs) continue;
        if (source && String(obj.source).toLowerCase() !== source) continue;
        if (severity && String(obj.severity).toLowerCase() !== severity) continue;
        rows.push(obj);
      }
    } catch {
      // file không tồn tại -> bỏ qua
    }
  }

  rows.sort((a, b) => b.timestamp - a.timestamp);
  const start = Math.max(0, offset || 0);
  const end = start + (limit || 200);
  return { total: rows.length, items: rows.slice(start, end) };
}

// ====== Routes ======

/**
 * GET /api/logs
 * Query:
 *  - source: gas|power (optional)
 *  - severity: error|warning|info (optional)
 *  - from: YYYY-MM-DD | ISO (default: đầu ngày hiện tại)
 *  - to: YYYY-MM-DD | ISO (default: cuối ngày hiện tại)
 *  - limit: number (default 200, max 2000)
 *  - offset: number (default 0)
 */
router.get("/", async (req, res) => {
  try {
    const now = Date.now();
    const startToday = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
    const endToday = endOfDay(now);

    const fromMs = parseDateQ(req.query.from) ?? startToday;
    const toMs = req.query.to ? endOfDay(parseDateQ(req.query.to)) : endToday;

    const source = req.query.source ? validSource(req.query.source) : null;
    const severity = req.query.severity ? validSeverity(req.query.severity) : null;
    const limit = Math.min(toNumber(req.query.limit, 200), 2000);
    const offset = Math.max(0, toNumber(req.query.offset, 0));

    const out = await readLogs({ fromMs, toMs, source, severity, limit, offset });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || "Log read error" });
  }
});

/**
 * POST /api/logs  (generic)
 * Body:
 * {
 *   source: 'gas'|'power',
 *   subsystem: 'O2'|'N2O'|'MA4'|'MA7'|'VA'|'CO2' | 'UPS'|'IPS'|'MAIN',
 *   severity: 'error'|'warning'|'info',
 *   message: string,
 *   details?: string,
 *   timestamp?: number|ISO
 * }
 */
router.post("/", async (req, res) => {
  try {
    const tsIn = req.body.timestamp;
    const ts =
      typeof tsIn === "number" ? tsIn : tsIn ? Date.parse(tsIn) : Date.now();

    const event = {
      id: randomUUID(),
      timestamp: Number.isFinite(ts) ? ts : Date.now(),
      source: validSource(req.body.source),
      subsystem: String(req.body.subsystem || "").toUpperCase() || undefined,
      severity: validSeverity(req.body.severity),
      message: String(req.body.message || ""),
      details: req.body.details ? String(req.body.details) : undefined,
    };

    if (!event.message) {
      return res.status(400).json({ error: "message is required" });
    }

    await appendLogLine(event);
    res.status(201).json({ ok: true, id: event.id });
  } catch (e) {
    res.status(500).json({ error: e.message || "Log write error" });
  }
});

/**
 * POST /api/logs/gas
 * Body:
 * { code: 'O2'|'N2O'|'MA4'|'MA7'|'VA'|'CO2', level: 'high'|'low'|'normal', value?: number, unit?: string, note?: string }
 */
router.post("/gas", async (req, res) => {
  try {
    const code = String(req.body.code || "").toUpperCase();
    const level = String(req.body.level || "normal").toLowerCase();
    const value = req.body.value;
    const unit = req.body.unit || "bar";

    const severity = level === "normal" ? "info" : "warning";
    const msg =
      level === "high"
        ? `Gas ${code}: pressure HIGH${Number.isFinite(value) ? ` (${value} ${unit})` : ""}.`
        : level === "low"
        ? `Gas ${code}: pressure LOW${Number.isFinite(value) ? ` (${value} ${unit})` : ""}.`
        : `Gas ${code}: back to NORMAL${Number.isFinite(value) ? ` (${value} ${unit})` : ""}.`;

    const event = {
      id: randomUUID(),
      timestamp: Date.now(),
      source: "gas",
      subsystem: code,
      severity,
      message: msg,
      details: req.body.note ? String(req.body.note) : undefined,
    };

    await appendLogLine(event);
    res.status(201).json({ ok: true, id: event.id });
  } catch (e) {
    res.status(500).json({ error: e.message || "Gas log write error" });
  }
});

/**
 * POST /api/logs/power
 * Body:
 * { key: 'UPS'|'IPS'|'MAIN', status: boolean, note?: string }
 * - status: true => info (Normal), false => error (Fault)
 */
router.post("/power", async (req, res) => {
  try {
    const key = String(req.body.key || "").toUpperCase();
    const status = Boolean(req.body.status);

    const severity = status ? "info" : "error";
    const msg = status ? `${key} supply NORMAL.` : `${key} supply FAULT!`;

    const event = {
      id: randomUUID(),
      timestamp: Date.now(),
      source: "power",
      subsystem: key,
      severity,
      message: msg,
      details: req.body.note ? String(req.body.note) : undefined,
    };

    await appendLogLine(event);
    res.status(201).json({ ok: true, id: event.id });
  } catch (e) {
    res.status(500).json({ error: e.message || "Power log write error" });
  }
});

/**
 * GET /api/logs/stats
 * Query: from, to, source
 * Trả: { total, error, warning, info }
 */
router.get("/stats", async (req, res) => {
  try {
    const now = Date.now();
    const fromMs = parseDateQ(req.query.from) ?? new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
    const toMs = parseDateQ(req.query.to) ? endOfDay(parseDateQ(req.query.to)) : endOfDay(now);
    const source = req.query.source ? validSource(req.query.source) : null;

    const { items } = await readLogs({
      fromMs,
      toMs,
      source,
      severity: null,
      limit: 100000,
      offset: 0,
    });

    const stats = { total: items.length, error: 0, warning: 0, info: 0 };
    for (const it of items) {
      const s = String(it.severity).toLowerCase();
      if (stats[s] != null) stats[s]++;
    }
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message || "Stats error" });
  }
});

module.exports = router;
