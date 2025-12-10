// server/src/services/gas.service.js
const { Gas, GAS_CODES } = require("../models/gas.model");

// 0 = Normal, 1 = High, 2 = Low
const STATUS_MAP = {
  NORMAL: 0, OK: 0,
  HIGH: 1, HI: 1,
  LOW: 2,  LO: 2,
};

function parseStatus(input) {
  // Chấp nhận: 0/1/2 | "0"/"1"/"2" | "normal"/"high"/"low" (không phân biệt hoa/thường)
  if (input === null || input === undefined) return null;

  // numeric (or numeric string)
  const n = Number(input);
  if (Number.isFinite(n)) {
    if (n === 0 || n === 1 || n === 2) return n;
  }

  // string enums
  if (typeof input === "string") {
    const key = input.trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(STATUS_MAP, key)) {
      return STATUS_MAP[key];
    }
  }

  return null; // invalid
}

async function ensureAll() {
  // Tạo đủ 6 khí nếu thiếu (không còn trường alarm)
  for (const code of GAS_CODES) {
    await Gas.updateOne(
      { code },
      { $setOnInsert: { code, name: code, status: 0 } },
      { upsert: true }
    );
  }
}

async function listOrdered() {
  await ensureAll();
  const docs = await Gas.find({}).lean();
  const by = Object.fromEntries(docs.map((d) => [d.code, d]));
  // Trả về đúng model: { code, name, status, updatedAt }
  return GAS_CODES.map((c) => {
    const row = by[c];
    return row
      ? row
      : { code: c, name: c, status: 0, updatedAt: new Date(0) };
  });
}

async function getByCode(code) {
  if (!code) return null;
  return Gas.findOne({ code: String(code).toUpperCase() }).lean();
}

async function setStatus(code, status) {
  const _code = String(code || "").toUpperCase();
  const s = parseStatus(status);
  if (!GAS_CODES.includes(_code)) {
    throw new Error(`UNKNOWN_GAS_CODE:${_code}`);
  }
  if (s === null) {
    throw new Error(`INVALID_STATUS:${status} (accept 0|1|2 or normal|high|low)`);
  }

  const row = await Gas.findOneAndUpdate(
    { code: _code },
    { $set: { status: s } },
    { new: true, upsert: true }
  ).lean();

  return row;
}

async function bulkUpdate(items) {
  // items: [{ code, status }]
  if (!Array.isArray(items) || items.length === 0) {
    return listOrdered();
  }

  const bulk = Gas.collection.initializeUnorderedBulkOp();
  let cnt = 0;

  for (const it of items) {
    const code = String(it?.code || it?.id || "").toUpperCase();
    if (!GAS_CODES.includes(code)) continue;

    const s = parseStatus(it?.status);
    if (s === null) continue; // bỏ qua item sai

    bulk.find({ code }).upsert().updateOne({ $set: { status: s } });
    cnt++;
  }

  if (cnt > 0) {
    await bulk.execute();
  }

  return listOrdered();
}

module.exports = {
  ensureAll,
  listOrdered,
  getByCode,
  setStatus,
  bulkUpdate,
};
