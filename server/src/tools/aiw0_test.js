// aiw_test.js
// Đọc 4 kênh AI từ S7-200 SMART qua nodes7:
//   Mặc định đọc PIW0, PIW2, PIW4, PIW6 (có thể chuyển sang IW* bằng .env)
//
// - AI raw S7-200 SMART thường 0..32000. Nếu hệ của bạn là 0..27648, chỉnh AI_RAW_MAX.
// - Đổi dải ENG_MIN/ENG_MAX theo cảm biến (ví dụ 0..10 bar, 0..100 %, 0..50 °C, ...)

require('dotenv').config();
const S7 = require('nodes7');

const PLC_IP   = process.env.PLC_IP   || '192.168.1.200';
const PLC_RACK = Number(process.env.PLC_RACK || 0);
const PLC_SLOT = Number(process.env.PLC_SLOT || 1);

const TAG_PREFIX = (process.env.TAG_PREFIX || 'PIW').toUpperCase(); // 'PIW' hoặc 'IW'
const POLL_MS    = Number(process.env.POLL_MS || 1000);

const RAW_MAX = Number(process.env.AI_RAW_MAX || 32000); // 32000 (S7-200 SMART) hoặc 27648
const ENG_MIN = Number(process.env.ENG_MIN || 0);
const ENG_MAX = Number(process.env.ENG_MAX || 10);

// 4 kênh AI → word cách nhau 2 byte
const AI_TAGS = {
  AI1: `${TAG_PREFIX}0`,
  AI2: `${TAG_PREFIX}2`,
  AI3: `${TAG_PREFIX}4`,
  AI4: `${TAG_PREFIX}6`,
};

// Scale 4–20mA (hoặc 0–10V) từ raw → kỹ thuật
// Nếu cảm biến 4–20 mA: map 0..RAW_MAX ≈ 4..20 mA -> ENG_MIN..ENG_MAX
// Ở nhiều PLC, module đã scale về 0..RAW_MAX theo 0..full-scale (ví dụ 0..10V).
// Tuỳ phần cứng, có thể bạn cần offset 4 mA. Dưới đây là 2 lựa chọn:

function scaleRawLinear(raw, rawMin = 0, rawMax = RAW_MAX, engMin = ENG_MIN, engMax = ENG_MAX) {
  const r = Math.max(rawMin, Math.min(raw, rawMax));
  return engMin + (r - rawMin) * (engMax - engMin) / (rawMax - rawMin);
}

// Nếu bạn chắc chắn đầu vào là 4–20 mA và PLC cho ra 0..RAW_MAX ≈ 0..20 mA,
// thì 4 mA ≈ 0.2*RAW_MAX. Bật OFFSET_4MA=true để dùng công thức này.
const OFFSET_4MA = (process.env.OFFSET_4MA || 'false').toLowerCase() === 'true';
function scale4to20(raw, rawMax = RAW_MAX, engMin = ENG_MIN, engMax = ENG_MAX) {
  const rawAt4mA  = 0.2 * rawMax;       // 4/20
  const rawAt20mA = rawMax;
  const r = Math.max(rawAt4mA, Math.min(raw, rawAt20mA));
  return engMin + (r - rawAt4mA) * (engMax - engMin) / (rawAt20mA - rawAt4mA);
}

const conn = new S7();
let connected = false;
let timer = null;

function connect() {
  console.log(`Connecting to ${PLC_IP} (rack=${PLC_RACK}, slot=${PLC_SLOT}) ...`);
  conn.initiateConnection(
    { host: PLC_IP, port: 102, rack: PLC_RACK, slot: PLC_SLOT },
    (err) => {
      if (err) {
        console.error('[S7] Connection error:', err?.message || err);
        // thử lại sau 3s
        setTimeout(connect, 3000);
        return;
      }
      connected = true;
      console.log('[S7] Connected.');

      // Khai báo tag map
      conn.setTranslationCB((tag) => AI_TAGS[tag]);
      conn.addItems(Object.keys(AI_TAGS)); // ['AI1','AI2','AI3','AI4']

      // Bắt đầu poll
      poll();
      timer = setInterval(poll, POLL_MS);
    }
  );

  // Sự kiện đóng kết nối
//   conn.on('error', (e) => {
//     console.error('[S7] Error:', e?.message || e);
//   });
}

function poll() {
  if (!connected) return;
  conn.readAllItems((err, values) => {
    if (err) {
      console.error('[S7] readAllItems error:', err?.message || err);
      // cố gắng reconnect
      safeCloseAndReconnect();
      return;
    }

    // values: { AI1: <number>, AI2: <number>, ... }
    const raw1 = Number(values.AI1 ?? 0);
    const raw2 = Number(values.AI2 ?? 0);
    const raw3 = Number(values.AI3 ?? 0);
    const raw4 = Number(values.AI4 ?? 0);

    // Chọn công thức scale phù hợp
    const scaleFn = OFFSET_4MA ? scale4to20 : scaleRawLinear;

    const eng1 = scaleFn(raw1);
    const eng2 = scaleFn(raw2);
    const eng3 = scaleFn(raw3);
    const eng4 = scaleFn(raw4);

    const ts = new Date().toISOString();
    console.log(`[${ts}] RAW:`, { raw1, raw2, raw3, raw4 },
                ' → ENG:', { eng1, eng2, eng3, eng4 });
  });
}

function safeCloseAndReconnect() {
  connected = false;
  if (timer) { clearInterval(timer); timer = null; }
  try { conn.dropConnection(); } catch (_) {}
  setTimeout(connect, 1500);
}

process.on('SIGINT', () => {
  console.log('Exiting...');
  if (timer) clearInterval(timer);
  try { conn.dropConnection(); } catch (_) {}
  process.exit(0);
});

connect();
