const ModbusService = require('../models/modbusClient');
const gasService = require('./gas.service');
const Power = require('../models/Power');

// Poll config
const DI_OFFSET = 0;
const DI_COUNT = 16; // đọc 16 bit cho đủ
const POLL_MS = Number(process.env.DI_POLL_MS || 2000);

// Gas mapping: DI0..DI5
const GAS_DI_MAP = [
  { code: 'O2',  bit: 0 },
  { code: 'N2O', bit: 1 },
  { code: 'MA4', bit: 2 },
  { code: 'MA7', bit: 3 },
  { code: 'VA',  bit: 4 },
  { code: 'CO2', bit: 5 },
];

// Power mapping: DI6..DI8
const POWER_DI_MAP = [
  { key: 'ups',  bit: 6 },
  { key: 'ips',  bit: 7 },
  { key: 'main', bit: 8 },
];

let timer = null;
let ticking = false;

function toStatus(bitValue) {
  // 1 = Fault, 0 = Normal
  return bitValue ? 1 : 0;
}
function toPowerStatus(bitValue) {
  // Power model dùng boolean
  return !!bitValue;
}

async function tickOnce() {
  const bits = await ModbusService.getDI(DI_OFFSET, DI_COUNT);

  // Gas update
  const gasList = GAS_DI_MAP.map(({ code, bit }) => ({
    code,
    status: toStatus(bits[bit]),
  }));
  await gasService.bulkUpdate(gasList);

  // Power update
  const bulk = Power.collection.initializeUnorderedBulkOp();
  POWER_DI_MAP.forEach(({ key, bit }) => {
    bulk.find({ key }).upsert().updateOne({
      $set: { status: toPowerStatus(bits[bit]), title: key.toUpperCase(), updatedAt: new Date() },
    });
  });
  await bulk.execute();
}

async function startDiPlcSync() {
  if (timer) return;
  await ModbusService.init();
  console.log(`[diPlcSync] start DI sync every ${POLL_MS}ms (offset=${DI_OFFSET}, count=${DI_COUNT})`);
  timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await tickOnce();
    } catch (e) {
      console.error('[diPlcSync] tick error:', e?.message || e);
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
