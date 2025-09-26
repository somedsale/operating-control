const express = require("express");
const router = express.Router();

/* ===== In-memory store cho áp suất hôm nay ===== */
const store = {
  filter: [], // [{t: ISO, v: number}]
  room:   [],
};
let dayKey = new Date().toISOString().slice(0, 10);

function ensureToday(ts = Date.now()) {
  const k = new Date(ts).toISOString().slice(0, 10);
  if (k !== dayKey) {
    dayKey = k;
    store.filter = [];
    store.room = [];
  }
}
function push(kind, value, ts = Date.now()) {
  ensureToday(ts);
  const point = { t: new Date(ts).toISOString(), v: Number(value) };
  store[kind].push(point);
  // giữ tối đa ~1 ngày với chu kỳ 5s ≈ 17280 điểm
  if (store[kind].length > 20000) store[kind].shift();
}

/* ===== Simulator: bơm dữ liệu 5s/lần ===== */
function rand(min, max) { return Math.random() * (max - min) + min; }

setInterval(() => {
  const ts = Date.now();
  // filter pressure dao động quanh 120 Pa
  const f =
    120 +
    20 * Math.sin((2 * Math.PI * (ts % (60 * 60 * 1000))) / (60 * 60 * 1000)) +
    rand(-3, 3);
  // room pressure dao động quanh 15 Pa (dương cho phòng áp dương)
  const r =
    15 +
    5 * Math.sin((2 * Math.PI * (ts % (20 * 60 * 1000))) / (20 * 60 * 1000)) +
    rand(-1.5, 1.5);

  push("filter", f, ts);
  push("room", r, ts);
}, 5000);

/* ===== Helpers: gộp theo bucket giây (mean) ===== */
function bucketize(points, bucketSec = 60) {
  const bms = Math.max(1, Number(bucketSec)) * 1000;
  const acc = new Map();
  for (const p of points) {
    const t = new Date(p.t).getTime();
    if (!Number.isFinite(t)) continue;
    const key = Math.floor(t / bms) * bms;
    const prev = acc.get(key) || { sum: 0, cnt: 0 };
    prev.sum += Number(p.v);
    prev.cnt += 1;
    acc.set(key, prev);
  }
  return Array.from(acc.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([k, o]) => ({ t: new Date(k).toISOString(), v: o.sum / o.cnt }));
}

/* ===== Endpoints ===== */

// Giá trị hiện tại
router.get("/filter", (req, res) => {
  const last = store.filter[store.filter.length - 1];
  res.json({ value: last ? last.v : 0, t: last ? last.t : new Date().toISOString() });
});

router.get("/room", (req, res) => {
  const last = store.room[store.room.length - 1];
  res.json({ value: last ? last.v : 0, t: last ? last.t : new Date().toISOString() });
});

// Lịch sử trong ngày (bucket theo ?bucketSec=)
router.get("/history", (req, res) => {
  const kind = (req.query.kind || "filter").toLowerCase();
  const bucketSec = Number(req.query.bucketSec || 60);
  const arr = kind === "room" ? store.room : store.filter;
  const points = bucketize(arr, bucketSec);
  res.json(points); // Right component đã chấp nhận array hoặc {points:[]}
});

module.exports = router;
