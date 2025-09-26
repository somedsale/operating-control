// server/src/services/gas.service.js
const { Gas, GAS_CODES } = require("../models/gas.model");

// Hiển thị label cho UI (giữ nguyên)
const LABEL = {
  O2: "Oxygen",
  N2O: "Nitrous Oxide",
  MA4: "Medical Air 4",
  MA7: "Medical Air 7",
  VA: "Vacuum",
  CO2: "Carbon Dioxide",
};

// 0 = Normal, 1 = Fault
const GAS_STATUS = {
  NORMAL: 0,
  FAULT: 1,
};

function normalizeStatus(s) {
  const n = Number(s);
  return n === GAS_STATUS.FAULT ? GAS_STATUS.FAULT : GAS_STATUS.NORMAL;
}

/** Tạo đủ 6 khí nếu DB chưa có (mặc định tất cả Normal) */
async function ensureSeed() {
  const existing = await Gas.find({}).lean();
  const existByCode = new Set(existing.map((x) => x.code));
  const toInsert = GAS_CODES
    .filter((c) => !existByCode.has(c))
    .map((code) => ({
      code,
      name: LABEL[code],
      status: GAS_STATUS.NORMAL, // mặc định Normal
    }));
  if (toInsert.length) {
    await Gas.insertMany(toInsert);
  }
}

/** Trả về danh sách theo thứ tự GAS_CODES */
async function listOrdered() {
  await ensureSeed();
  const all = await Gas.find({}).lean();
  const by = Object.fromEntries(all.map((x) => [x.code, x]));
  return GAS_CODES.map((c) => by[c]);
}

/** Lấy 1 khí theo code */
async function getByCode(code) {
  await ensureSeed();
  return Gas.findOne({ code: String(code).toUpperCase() }).lean();
}

/** Cập nhật status 1 khí (0=Normal, 1=Fault) */
async function setStatus(code, status) {
  await ensureSeed();
  const doc = await Gas.findOneAndUpdate(
    { code: String(code).toUpperCase() },
    { $set: { status: normalizeStatus(status), updatedAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();
  return doc;
}

/** Cập nhật hàng loạt: [{ code, status }] (status chỉ 0|1) */
async function bulkUpdate(list) {
  await ensureSeed();
  const ops = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const code = String(item.code || item.id || "").toUpperCase();
    if (!GAS_CODES.includes(code)) return;
    const status = normalizeStatus(item.status);
    ops.push({
      updateOne: {
        filter: { code },
        update: { $set: { status, updatedAt: new Date() } },
        upsert: false,
      },
    });
  });
  if (ops.length) {
    await Gas.bulkWrite(ops);
  }
  return listOrdered();
}

module.exports = {
  listOrdered,
  getByCode,
  setStatus,
  bulkUpdate,
  ensureSeed,
  GAS_STATUS, // export để controller/service khác dùng
};
