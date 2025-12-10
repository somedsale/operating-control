// server/src/controllers/rs485Controller.js
const plc = require('../services/plc.service');

/* Helpers */
function parseParity(v) {
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'none') return 0;
    if (s === 'odd')  return 1;
    if (s === 'even') return 2;
  }
  const n = Number(v);
  if ([0,1,2].includes(n)) return n;
  throw new Error('Invalid parity: must be 0|1|2 or "none"|"odd"|"even"');
}

exports.getRS485 = async (req, res) => {
  try {
    const cfg = await plc.readRS485();   // { address, baud, parity }
    return res.json({ ok: true, data: cfg });
  } catch (e) {
    return res.status(503).json({
      ok: false,
      error: e?.message || String(e),
    });
  }
};

exports.setRS485 = async (req, res) => {
  try {
    const { address, baud, parity } = req.body || {};
    if (address === undefined) throw new Error('address is required (0..255)');
    if (baud === undefined)    throw new Error('baud is required (e.g. 9600, 19200, 115200)');
    const addrVal = Number(address);
    if (!Number.isFinite(addrVal) || addrVal < 0 || addrVal > 255) {
      throw new Error('address must be 0..255');
    }
    const baudVal = Number(baud);
    if (!Number.isFinite(baudVal) || baudVal <= 0) {
      throw new Error('baud must be a positive number');
    }
    const parityVal = parseParity(parity ?? 0);

    await plc.writeRS485({ address: addrVal, baud: baudVal, parity: parityVal });
    const after = await plc.readRS485(); // đọc lại để confirm

    return res.json({ ok: true, data: after });
  } catch (e) {
    return res.status(400).json({
      ok: false,
      error: e?.message || String(e),
    });
  }
};
