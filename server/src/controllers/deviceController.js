// server/src/controllers/deviceController.js
// Controller điều khiển thiết bị bằng Siemens S7 (nodes7) thay cho Modbus TCP

const Device = require('../models/Device');
const plc = require('../services/plc.service'); // service S7: ensureKey, readAll, writeOne

// ===== Helpers =====
const normId = (x) => String(x ?? '').trim().toLowerCase();

// relay (1-based) -> key r{n}
function toKey(relayNumber) {
  const n = Number(relayNumber);
  if (!Number.isInteger(n) || n <= 0) return null;   // 0 hoặc invalid => không map
  return `r${n}`;
}

const parseRelay = (v, max) => {
  let n = Number(v || 0);
  if (!Number.isInteger(n) || n < 0) n = 0;
  if (Number.isInteger(max) && max > 0 && n > max) n = max;
  return n;
};

// Đọc tất cả trạng thái PLC an toàn
async function safeReadAllPLC() {
  try {
    const states = await plc.readAll(); // { r1:bool, r2:bool, ... }
    return states && typeof states === 'object' ? states : {};
  } catch {
    return {};
  }
}
// GET /api/devices/plc
// Đọc trực tiếp tất cả trạng thái relay từ PLC (không dùng DB)
exports.readPLCStates = async (req, res, next) => {
  try {
    const states = await plc.readAll(); // ví dụ { r1:true, r2:false, ... }
    const keys = Object.keys(states || {}).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '')) || 0;
      const nb = parseInt(b.replace(/\D/g, '')) || 0;
      return na - nb;
    });

    const data = keys.map((k) => ({
      key: k,
      relay: Number(k.replace(/\D/g, '')) || 0,
      hwOn: !!states[k],
    }));

    res.json({ ok: true, total: data.length, states: data });
  } catch (e) {
    next(e);
  }
};

// ===== Controllers =====

// GET /api/devices
// Trả về danh sách thiết bị (mảng thuần), kèm trạng thái phần cứng (hwOn) từ PLC
exports.getAll = async (req, res, next) => {
  try {
    const list = await Device.find({}).lean();
    const plcStates = await safeReadAllPLC();

    const data = list.map((d) => {
      const key = toKey(d.relay);
      const hwOn = key ? !!plcStates[key] : false;
      return {
        deviceId: normId(d.deviceId || d.id || d._id),
        name: d.name || d.deviceId,
        relay: Number(d.relay || 0),
        isOn: typeof d.isOn === 'boolean' ? d.isOn : undefined,
        hwOn,
      };
    });

    // FE (Settings/Lighting/TimerTriple) đang expect: mảng []
    res.json(data);
  } catch (e) {
    next(e);
  }
};

// GET /api/devices/mapping
// Trả về mảng [{ deviceId, relay }]
exports.getMapping = async (req, res, next) => {
  try {
    const list = await Device.find({}).lean();
    const mapping = list
      .map((d) => ({
        deviceId: normId(d.deviceId || d.id || d._id),
        relay: Number(d.relay || 0),
      }))
      .filter((m) => m.deviceId);
    res.json(mapping);
  } catch (e) {
    next(e);
  }
};

// PUT /api/devices/mapping  body: { mapping: [{ deviceId, relay }] }
exports.updateMapping = async (req, res, next) => {
  try {
    const { mapping } = req.body;
    if (!Array.isArray(mapping)) {
      return res.status(400).json({ ok: false, error: 'mapping must be an array' });
    }

    const total = Number(process.env.RELAY_TOTAL || 64);
    const ops = mapping
      .map((m) => {
        const deviceId = normId(m.deviceId);
        if (!deviceId) return null;
        const relay = parseRelay(m.relay, total);
        return {
          updateOne: {
            filter: { deviceId },
            update: { $set: { deviceId, relay } },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    if (ops.length) await Device.bulkWrite(ops);

    const list = await Device.find({}).lean();
    const out = list
      .map((d) => ({
        deviceId: normId(d.deviceId || d.id || d._id),
        relay: Number(d.relay || 0),
      }))
      .filter((m) => m.deviceId);

    res.json({ ok: true, mapping: out });
  } catch (e) {
    next(e);
  }
};

// PATCH /api/devices/:deviceId/state  { on: boolean }
// Bật/tắt 1 thiết bị: ghi PLC + cập nhật Mongo
exports.setState = async (req, res, next) => {
  try {
    const deviceId = normId(req.params.deviceId);
    const on = !!req.body?.on;

    const dev = await Device.findOne({ deviceId });
    if (!dev) return res.status(404).json({ ok: false, error: 'Device not found' });

    const key = toKey(dev.relay);
    let hwOn = false;

    if (key) {
      // ghi PLC
      await plc.ensureKey(key);
      await plc.writeOne(key, on);

      // đọc lại xác nhận
      const states = await safeReadAllPLC();
      hwOn = key in states ? !!states[key] : on;
    } else {
      // không map PLC, chỉ lưu trạng thái mong muốn
      hwOn = false;
    }

    // đồng bộ DB
    dev.isOn = on;
    dev.hwOn = hwOn;
    await dev.save();

    res.json({ ok: true, deviceId, isOn: dev.isOn, hwOn: dev.hwOn });
  } catch (e) {
    next(e);
  }
};

// PATCH /api/devices/:deviceId/relay  { relay: number }
// Đổi relay cho 1 thiết bị (1-based, 0 = bỏ map)
exports.setRelay = async (req, res, next) => {
  try {
    const deviceId = normId(req.params.deviceId);
    if (!deviceId) return res.status(400).json({ ok: false, error: 'Invalid deviceId' });

    const total = Number(process.env.RELAY_TOTAL || 64);
    const relay = parseRelay(req.body?.relay, total);

    const dev = await Device.findOne({ deviceId });
    if (!dev) return res.status(404).json({ ok: false, error: 'Device not found' });

    dev.relay = relay;
    await dev.save();

    res.json({ ok: true, deviceId, relay });
  } catch (e) {
    next(e);
  }
};
