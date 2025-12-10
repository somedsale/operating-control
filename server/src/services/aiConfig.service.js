// server/src/services/aiConfig.service.js
// Quản lý cấu hình kênh AI (AiChannelConfig) và đồng bộ với plc.service

const AiChannelConfig = require('../models/AiChannelConfig');
const plc = require('./plc.service');

/* ============================================================
 *  Load & Apply toàn bộ cấu hình
 * ============================================================ */
async function initAndApply() {
  const rows = await AiChannelConfig.find({ enabled: true }).lean();
  if (!rows.length) {
    console.warn('[aiCfg] No AI channel configs found in DB');
    return;
  }

  for (const row of rows) {
    try {
      if (row.mode) plc.setChannelMode(row.index, row.mode);
      if (row.addr) plc.setChannelAddr(row.index, row.addr);
      else plc.clearChannelAddr(row.index);
    } catch (e) {
      console.error(`[aiCfg] apply channel ${row.index} failed:`, e.message);
    }
  }

  console.log(`[aiCfg] applied ${rows.length} AI channel configs to PLC`);
}

/* ============================================================
 *  Lấy cấu hình
 * ============================================================ */
async function getChannel(index) {
  return AiChannelConfig.findOne({ index }).lean();
}

async function getAll() {
  return AiChannelConfig.find().sort({ index: 1 }).lean();
}

/* ============================================================
 *  Update cấu hình & áp dụng
 * ============================================================ */
async function setChannel(index, data = {}) {
  const row = await AiChannelConfig.findOneAndUpdate(
    { index },
    data,
    { new: true, upsert: true }
  ).lean();

  try {
    if (row.mode) plc.setChannelMode(row.index, row.mode);
    if (row.addr) plc.setChannelAddr(row.index, row.addr);
    else plc.clearChannelAddr(row.index);
    console.log(`[aiCfg] updated channel ${row.index} (${row.mode})`);
  } catch (e) {
    console.error(`[aiCfg] failed to apply channel ${row.index}:`, e.message);
  }

  return row;
}

/* ============================================================
 *  Hàm tiện ích riêng lẻ (mode / addr)
 * ============================================================ */
async function setChannelMode(index, mode) {
  const row = await AiChannelConfig.findOneAndUpdate(
    { index },
    { mode },
    { new: true, upsert: true }
  ).lean();

  try {
    plc.setChannelMode(row.index, row.mode);
    console.log(`[aiCfg] channel ${row.index} mode=${row.mode} applied`);
  } catch (e) {
    console.error(`[aiCfg] failed to apply mode for channel ${row.index}:`, e.message);
  }

  return row;
}

async function setChannelAddr(index, addr) {
  const row = await AiChannelConfig.findOneAndUpdate(
    { index },
    { addr },
    { new: true, upsert: true }
  ).lean();

  try {
    if (addr) plc.setChannelAddr(row.index, addr);
    else plc.clearChannelAddr(row.index);
    console.log(`[aiCfg] channel ${row.index} addr=${addr || '(cleared)'} applied`);
  } catch (e) {
    console.error(`[aiCfg] failed to apply addr for channel ${row.index}:`, e.message);
  }

  return row;
}

/* ============================================================ */
module.exports = {
  initAndApply,
  getAll,
  getChannel,
  setChannel,
  setChannelMode,
  setChannelAddr,
};
