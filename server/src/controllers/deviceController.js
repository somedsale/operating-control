// server/src/controllers/deviceController.js
const Device = require('../models/Device');
const modbusService = require('../models/modbusClient');
module.exports = (driver) => {
  const safeDriver = {
    type: driver?.type || 'mock',
    read: typeof driver?.read === 'function' ? driver.read : async () => false,
    write: typeof driver?.write === 'function' ? driver.write : async () => {},
  };

  return {
    // GET /api/devices
    getAll: async (req, res, next) => {
      try {
        const list = await Device.find({}).lean();
        const withHw = await Promise.all(
          list.map(async (d) => {
            let hwOn = false;
            if (Number(d.relay) > 0) {
              try { hwOn = await safeDriver.read(d.relay); } catch {}
            }
            return { ...d, hwOn };
          })
        );
        res.json(withHw);
      } catch (e) { next(e); }
    },

    // PATCH /api/devices/:deviceId/state  { on: boolean }
    setState: async (req, res, next) => {
      try {
        const deviceId = String(req.params.deviceId || '').toLowerCase();
        const on = !!req.body.on;

        const dev = await Device.findOne({ deviceId });
        if (!dev) return res.status(404).json({ error: 'Device not found' });

        if (Number(dev.relay) > 0) {
          await safeDriver.write(dev.relay, on); // điều khiển relay thật
          await modbusService.toggleDO(dev.relay-1); // đồng bộ sang PLC
        }
        dev.isOn = on;
        dev.hwOn = on;
        await dev.save();

        res.json({ ok: true, deviceId: dev.deviceId, isOn: dev.isOn, hwOn: dev.hwOn });
      } catch (e) { next(e); }
    },

    // PUT /api/devices/mapping  { mapping: [{ deviceId, relay }] }
    updateMapping: async (req, res, next) => {
      try {
        const { mapping } = req.body;
        if (!Array.isArray(mapping)) {
          return res.status(400).json({ error: 'mapping must be an array' });
        }

        const ops = mapping.map((m) => {
          const deviceId = String(m.deviceId || '').toLowerCase();
          const relay = Number(m.relay || 0);
          return {
            updateOne: {
              filter: { deviceId },
              update: { $set: { deviceId, relay } },
              upsert: true,
            },
          };
        });

        if (ops.length) await Device.bulkWrite(ops);
        const updated = await Device.find({}).lean();

        res.json({ ok: true, devices: updated });
      } catch (e) { next(e); }
    },
  };
};
