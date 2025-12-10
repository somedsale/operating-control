// server/src/services/diPlcSync.js
// Đồng bộ DI từ PLC S7 (nodes7) sang các collection Gas/Power
// Mapping bit mới:
//  0  -> High O2
//  1  -> Low O2
//  2  -> High N2O
//  3  -> Low N2O
//  4  -> High MA4
//  5  -> Low MA4
//  6  -> High MA7
//  7  -> Low MA7
//  8  -> Low VA
//  9  -> High CO2
// 10  -> Low CO2
// 11  -> IPS
// 12  -> UPS
// 13  -> Main
//
// Ghi chú: i1 -> bit0 (I0.0), i2 -> bit1 (I0.1), ... i14 -> bit13

const plc = require('../services/plc.service');   // dùng readInputs()
const gasService = require('./gas.service');
const Power = require('../models/Power');

// ===== Poll & Watchdog config =====
const POLL_MS = Number(process.env.DI_POLL_MS || 2000);
// Sau bao nhiêu lần đọc lỗi liên tiếp thì reset DB về trạng thái an toàn
const FAIL_RESET_TICKS = Number(process.env.DI_FAIL_RESET_TICKS || 2);

// Nếu muốn KHÔNG reset mà giữ nguyên DB (chỉ đánh dấu offline), set = "keep"
const FAIL_RESET_MODE = String(process.env.DI_FAIL_RESET_MODE || 'reset').toLowerCase(); // 'reset' | 'keep'

// Bộ đếm lỗi liên tiếp và cờ online
let failCount = 0;
let plcOnline = false;

/** Trả về boolean của bitIndex (0-based) từ đối tượng inputs của PLC
 * inputs dạng { i1: true/false, i2: ... }
 */
function getBit(inputsObj, bitIndex) {
  const key = `i${bitIndex + 1}`;
  return !!inputsObj?.[key];
}

/** Tính trạng thái gas từ 2 bit High/Low
 *  Ưu tiên: High (1) > Low (2) > Normal (0)
 *  Nếu gas chỉ có Low (không có High) thì highBitIndex = null
 */
function computeGasStatus(inputs, highBitIndex, lowBitIndex) {
  const isHigh = (highBitIndex != null) ? getBit(inputs, highBitIndex) : false;
  const isLow  = (lowBitIndex  != null) ? getBit(inputs, lowBitIndex)  : false;

  if (isHigh) return 1; // HIGH
  if (isLow)  return 2; // LOW
  return 0;             // NORMAL
}

/* ---------- GAS bit mapping ---------- */
const GAS_ORDER = ['O2','N2O','MA4','MA7','VA','CO2'];
const GAS_BIT_MAP = [
  { code: 'O2',  high: 0,  low: 1  },
  { code: 'N2O', high: 2,  low: 3  },
  { code: 'MA4', high: 4,  low: 5  },
  { code: 'MA7', high: 6,  low: 7  },
  { code: 'VA',  high: null, low: 8 }, // VA chỉ có Low
  { code: 'CO2', high: 9,  low: 10 },
];

/* ---------- POWER bit mapping ---------- */
const POWER_BIT_MAP = [
  { key: 'ips',  bit: 11 },
  // { key: 'ups',  bit: 12 },
  // { key: 'main', bit: 13 },
];

/* ---------- Power helpers ---------- */
function toPowerStatus(bitValue) {
  return !!bitValue; // true = Fault, false = Normal
}

/** Build list Gas an toàn khi offline: tất cả = 0 (Normal) */
function buildSafeGasList() {
  return GAS_ORDER.map(code => ({ code, status: 0 }));
}

/** Build list Power an toàn khi offline: tất cả = false (Normal) */
function buildSafePowerList() {
  return POWER_BIT_MAP.map(({ key }) => ({ key, status: false, title: key.toUpperCase() }));
}

async function writePowerList(powerList) {
  if (!Power?.collection?.initializeUnorderedBulkOp) {
    // fallback nếu driver Mongo không có bulk
    for (const it of powerList) {
      await Power.updateOne(
        { key: it.key },
        {
          $set: {
            status: !!it.status,
            title: it.title || it.key.toUpperCase(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  } else {
    const bulk = Power.collection.initializeUnorderedBulkOp();
    powerList.forEach((it) => {
      bulk.find({ key: it.key }).upsert().updateOne({
        $set: {
          status: !!it.status,
          title: it.title || it.key.toUpperCase(),
          updatedAt: new Date(),
        },
      });
    });
    await bulk.execute();
  }
}

async function tickOnce() {
  // ===== 1) Cố gắng đọc toàn bộ DI (i1..iN) từ PLC
  let inputs = null;
  try {
    inputs = await plc.readInputs(); // ví dụ { i1:true, i2:false, ... }
  } catch (e) {
    // đọc thất bại; inputs = null
  }

  const validInputs = inputs && typeof inputs === 'object' && Object.keys(inputs).length > 0;

  if (validInputs) {
    // ===== ONLINE: cập nhật DB theo DI
    failCount = 0;
    plcOnline = true;

    // 2) Gas từ mapping (0=Normal, 1=High, 2=Low)
    const gasList = GAS_BIT_MAP.map(({ code, high, low }) => ({
      code,
      status: computeGasStatus(inputs, high, low),
    }));
    await gasService.bulkUpdate(gasList);

    // 3) Power từ mapping
    const powerList = POWER_BIT_MAP.map(({ key, bit }) => ({
      key,
      status: toPowerStatus(getBit(inputs, bit)),
      title: key.toUpperCase(),
    }));
    await writePowerList(powerList);

    return; // done 1 tick
  }

  // ===== OFFLINE hoặc dữ liệu không hợp lệ
  failCount += 1;

  if (FAIL_RESET_MODE === 'keep') {
    // Chỉ đánh dấu offline (nếu bạn có chỗ lưu), không reset DB
    plcOnline = false;
    // Ví dụ: bạn có thể bắn event/emit hoặc update một collection "SystemState"
    // await SystemState.updateOne({ key: 'plc' }, { $set: { online: false, updatedAt: new Date() } }, { upsert: true });
    return;
  }

  if (failCount >= FAIL_RESET_TICKS) {
    // Reset DB về trạng thái an toàn
    plcOnline = false;

    const gasSafe = buildSafeGasList();
    await gasService.bulkUpdate(gasSafe);

    const powerSafe = buildSafePowerList();
    await writePowerList(powerSafe);

    // Sau khi reset, không reset failCount về 0 để tiếp tục giữ an toàn
    // (hoặc bạn có thể đặt failCount = 0 tuỳ nhu cầu)
  }
}

let timer = null;
let ticking = false;

async function startDiPlcSync() {
  if (timer) return;
  console.log(`[diPlcSync] start DI sync every ${POLL_MS}ms (nodes7 PLC) | failResetTicks=${FAIL_RESET_TICKS} mode=${FAIL_RESET_MODE}`);

  timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await tickOnce();
    } catch (e) {
      const msg = e?.message || String(e);
      // Không dừng scheduler; log lỗi và chạy vòng sau.
      console.error('[diPlcSync] tick error:', msg);
    } finally {
      ticking = false;
    }
  }, POLL_MS);
}

function stopDiPlcSync() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[diPlcSync] stopped');
  }
}

module.exports = { startDiPlcSync, stopDiPlcSync };
