// server/src/services/gasPlcSync.js
const ModbusService = require('../models/modbusClient');
const gasService = require('./gas.service');

// ===== Cấu hình đọc DI =====
// Offset & count để đọc 1 block cho gọn. Có thể chỉnh bằng .env
const DI_OFFSET = Number(process.env.DI_OFFSET || 0);
const DI_COUNT  = Number(process.env.DI_COUNT  || 8);
const POLL_MS   = Number(process.env.GAS_DI_POLL_MS || 2000);

// Map bit → khí → cách diễn giải Fault
// activeHighFault = true: DI=1 => Fault; false: DI=0 => Fault
const GAS_DI_MAP = [
  { code: 'O2',  bit: 0, activeHighFault: true },
  { code: 'N2O', bit: 1, activeHighFault: true },
  { code: 'MA4', bit: 2, activeHighFault: true },
  { code: 'MA7', bit: 3, activeHighFault: true },
  { code: 'VA',  bit: 4, activeHighFault: true },
  { code: 'CO2', bit: 5, activeHighFault: true },
];

// ===== Đồng bộ =====
let timer = null;
let ticking = false;

function toStatusBit(bitValue, activeHighFault) {
  // Trả về 0=Normal, 1=Fault
  return activeHighFault ? (bitValue ? 1 : 0) : (bitValue ? 0 : 1);
}

async function readDIBlockWithRetry(tries = 2, delayMs = 250) {
  for (let i = 0; i < tries; i++) {
    try {
      return await ModbusService.getDI(DI_OFFSET, DI_COUNT);
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('timed') || msg.includes('reset')) {
        try { await ModbusService.reset(); } catch {}
      }
      if (i === tries - 1) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function tickOnce() {
  // Đọc block DI rồi map về danh sách { code, status }
  const bits = await readDIBlockWithRetry(2, 300); // mảng boolean length=DI_COUNT
  const list = GAS_DI_MAP.map(({ code, bit, activeHighFault }) => {
    const v = !!bits[bit - DI_OFFSET]; // bit là offset tuyệt đối; nếu bạn ghi bit là tuyệt đối thì không cần -DI_OFFSET
    const status = toStatusBit(v, activeHighFault); // 0|1
    return { code, status };
  });
  // Cập nhật DB
  await gasService.bulkUpdate(list);
}

async function startGasPlcSync() {
  if (timer) return;
  await ModbusService.init();
  console.log(`[gasPlcSync] start DI sync every ${POLL_MS}ms (offset=${DI_OFFSET}, count=${DI_COUNT})`);
  timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await tickOnce();
    } catch (e) {
      console.error('[gasPlcSync] tick error:', e?.message || e);
    } finally {
      ticking = false;
    }
  }, POLL_MS);
}

function stopGasPlcSync() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[gasPlcSync] stopped');
  }
}

module.exports = { startGasPlcSync, stopGasPlcSync };
