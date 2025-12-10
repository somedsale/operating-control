/**
 * Đồng bộ DO PLC với DB.
 * - Mặc định: DB -> PLC (nếu isOn khác hw hiện tại trên PLC thì ghi PLC).
 * - Riêng các device trong danh sách REVERSE_IDS (mặc định: ips_relay):
 *     PLC -> DB (không ghi PLC; cập nhật isOn, hwOn của DB theo PLC).
 */

const Device = require("../models/Device");
const plc = require("./plc.service");

// ===== ENV =====
const DO_SYNC_MS = Number(process.env.DO_SYNC_MS || 2000);             // chu kỳ sync
const DO_SYNC_BATCH_DELAY = Number(process.env.DO_SYNC_BATCH_DELAY || 40); // nghỉ giữa 2 lệnh ghi
const RELAY_TOTAL = Number(process.env.RELAY_TOTAL || 64);

// Danh sách thiết bị đồng bộ ngược từ PLC về DB (phân tách bằng dấu phẩy)
const REVERSE_IDS = new Set(
  (process.env.DO_SYNC_REVERSE_IDS || "ips_relay")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

let timer = null;
let running = false;

function toKey(relay) {
  const n = Number(relay);
  if (!Number.isInteger(n) || n <= 0 || n > RELAY_TOTAL) return null;
  return `r${n}`;
}

async function syncOnce() {
  if (running) return; // tránh chồng lấn
  running = true;

  try {
    // 1) Đọc tất cả thiết bị từ DB
    const list = await Device.find({}).lean();

    // 2) Đọc toàn bộ trạng thái DO từ PLC (lần 1)
    const plcStates = await plc.readAll().catch(() => ({}));

    // 3) Ghi PLC cho các thiết bị "thuận" (DB -> PLC); bỏ qua các device "ngược"
    for (const d of list) {
      const relay = Number(d.relay || 0);
      const key = toKey(relay);
      if (!key || !plc.RELAY_MAP?.[key]) continue;

      const actual = !!plcStates[key];     // trạng thái thực tế PLC
      const desired = !!d.isOn;            // mong muốn tại DB
      const reverse = REVERSE_IDS.has(d.deviceId); // có sync ngược không?

      if (reverse) {
        // 🔄 PLC -> DB: không ghi PLC ở đây
        continue;
      }

      // ➜ DB -> PLC (mặc định)
      if (desired !== actual) {
        try {
          await plc.ensureKey?.(key);
          await plc.writeOne(key, desired);
          if (DO_SYNC_BATCH_DELAY > 0) {
            await new Promise((r) => setTimeout(r, DO_SYNC_BATCH_DELAY));
          }
        } catch (e) {
          console.warn(`[DOSync] write ${key} -> ${desired} error:`, e?.message || e);
        }
      }
    }

    // 4) Đọc lại PLC (lần 2) để xác nhận cập nhật hwOn & cập nhật DB cho device "ngược"
    const confirmed = await plc.readAll().catch(() => ({}));
    const bulkOps = [];

    for (const d of list) {
      const relay = Number(d.relay || 0);
      const key = toKey(relay);
      if (!key || !plc.RELAY_MAP?.[key]) continue;

      const hwOn = !!confirmed[key];
      const reverse = REVERSE_IDS.has(d.deviceId);

      if (reverse) {
        // 🔄 PLC -> DB: cập nhật cả isOn lẫn hwOn theo PLC
        const needIsOn = d.isOn !== hwOn;
        const needHwOn = d.hwOn !== hwOn;
        if (needIsOn || needHwOn) {
          const set = {};
          if (needIsOn) set.isOn = hwOn;
          if (needHwOn) set.hwOn = hwOn;
          bulkOps.push({
            updateOne: { filter: { _id: d._id }, update: { $set: set } },
          });
        }
      } else {
        // ➜ DB -> PLC: chỉ cập nhật hwOn nếu thay đổi
        if (d.hwOn !== hwOn) {
          bulkOps.push({
            updateOne: { filter: { _id: d._id }, update: { $set: { hwOn } } },
          });
        }
      }
    }

    if (bulkOps.length) {
      await Device.bulkWrite(bulkOps);
    }
  } catch (e) {
    console.warn("[DOSync] cycle error:", e?.message || e);
  } finally {
    running = false;
  }
}

async function startDOSync() {
  if (timer) return;
  timer = setInterval(syncOnce, DO_SYNC_MS);
  // chạy ngay một vòng khi khởi động
  syncOnce().catch(() => {});
  console.log(`[DOSync] started, interval=${DO_SYNC_MS}ms, reverse=[${[...REVERSE_IDS].join(", ")}]`);
}

async function stopDOSync() {
  if (timer) clearInterval(timer);
  timer = null;
  console.log("[DOSync] stopped");
}

module.exports = { startDOSync, stopDOSync, _syncOnce: syncOnce };
