import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";

/* ====== Poll interval từ settings (fallback 10s) ====== */
const usePollSec = () =>
  useSelector((s) => s?.settings?.pollIntervalSec ?? 10);

/* ====== Chuẩn hoá dữ liệu khí (0=Normal, 1=Fault) ====== */
const GAS_ORDER = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];
const shapeGas = (raw) => {
  const by = {};
  (raw || []).forEach((it) => {
    const code = String(it?.code ?? it?.keyword ?? "").toUpperCase();
    if (!GAS_ORDER.includes(code)) return;
    const status = Number(it?.status) === 1 ? 1 : 0;
    by[code] = { code, status };
  });
  return GAS_ORDER.map((c) => by[c] ?? { code: c, status: 0 });
};

/* ====== Chuẩn hoá Power (true=Fault, false=Normal) ====== */
const POWER_KEYS = ["ups", "ips", "main"];
const shapePower = (raw) => {
  const arr = Array.isArray(raw) ? raw : [];
  const byKey = Object.fromEntries(
    arr.map((it) => [String(it?.key || "").toLowerCase(), !!it?.status])
  );
  return POWER_KEYS.map((k) => ({ key: k, fault: !!byKey[k] }));
};

/* ====== WebAudio beep (offline) ====== */
let audioCtx;
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tone(freq = 900, durMs = 140, type = "square", gain = 0.08) {
  const ctx = ensureAudioCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ctx.destination);
  osc.start();
  await sleep(durMs);
  osc.stop();
  osc.disconnect();
  g.disconnect();
}
async function alarmBeepPattern() {
  // beep đôi ngắn
  await tone(920, 140, "square", 0.09);
  await sleep(120);
  await tone(920, 140, "square", 0.09);
}

/* ====== Component toàn cục (floating button bottom-right) ====== */
export default function GlobalAlarm() {
  const pollIntervalSec = usePollSec();

  const [faultGas, setFaultGas] = useState(false);
  const [faultPower, setFaultPower] = useState(false);
  const hasFault = faultGas || faultPower;

  const [muted, setMuted] = useState(() => {
    const v = localStorage.getItem("alarmMuted");
    return v === "1";
  });

  // Unlock audio sau 1 lần chạm
  useEffect(() => {
    const unlock = () => {
      try { ensureAudioCtx(); } catch {}
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Poll cả GAS + POWER
  const loadAll = useCallback(async () => {
    try {
      const [gasRes, powerRes] = await Promise.allSettled([
        fetch("/api/gas"),
        fetch("/api/power"),
      ]);

      // GAS
      if (gasRes.status === "fulfilled") {
        const data = await gasRes.value.json().catch(() => []);
        const shaped = shapeGas(Array.isArray(data?.data) ? data.data : data);
        setFaultGas(shaped.some((g) => g.status === 1));
      }

      // POWER
      if (powerRes.status === "fulfilled") {
        const pData = await powerRes.value.json().catch(() => []);
        const shapedP = shapePower(Array.isArray(pData?.data) ? pData.data : pData);
        setFaultPower(shapedP.some((p) => p.fault));
      }
    } catch {
      // Không đổi trạng thái khi lỗi tổng; để lần poll sau cập nhật
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, Math.max(1, Number(pollIntervalSec)) * 1000);
    return () => clearInterval(id);
  }, [loadAll, pollIntervalSec]);

  // Phát tiếng khi có lỗi & chưa mute (định kỳ)
  useEffect(() => {
    let id;
    if (hasFault && !muted) {
      alarmBeepPattern(); // kêu ngay
      id = setInterval(alarmBeepPattern, 6000); // lặp
    }
    return () => id && clearInterval(id);
  }, [hasFault, muted]);

  // Label nút theo nguồn lỗi
  let label = "No Fault";
  if (faultGas && faultPower) label = "Gas + Power Fault";
  else if (faultGas) label = "Gas Fault";
  else if (faultPower) label = "Power Fault";

  // Toggle mute + lưu localStorage
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("alarmMuted", next ? "1" : "0");
  };

  return (
    <div className="fixed bottom-3 right-3 z-50">
      <button
        type="button"
        onClick={toggleMute}
        className={[
          "px-3 py-2 rounded-xl border text-sm font-semibold shadow-sm transition",
          muted
            ? "bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-100"
            : hasFault
            ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 animate-pulse"
            : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700",
        ].join(" ")}
        aria-pressed={!muted}
        aria-live="polite"
        title={muted ? "Unmute alarm" : "Mute alarm"}
      >
        {muted ? "Alarm Muted" : label}
      </button>
    </div>
  );
}
