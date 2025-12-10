// src/components/GlobalAlarm/index.jsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGas, fetchPower,
  selectGas, selectPower,
} from "../../features/status/statusSlice";
import { useTranslation } from "react-i18next";

/* ====== Poll interval từ settings (fallback 10s) ====== */
const usePollSec = () =>
  useSelector((s) => s?.settings?.pollIntervalSec ?? 10);

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
  await tone(920, 140, "square", 0.09);
  await sleep(120);
  await tone(920, 140, "square", 0.09);
}

export default function GlobalAlarm() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const pollIntervalSec = usePollSec();

  // lấy từ Redux
  const gas = useSelector(selectGas);       // [{code,status,fault}]
  const power = useSelector(selectPower);   // [{key,fault}]
  const faultGas = gas.some((g) => g.fault);
  const faultPower = power.some((p) => p.fault);
  const hasFault = faultGas || faultPower;

  const [muted, setMuted] = useState(() => localStorage.getItem("alarmMuted") === "1");
  const [faultSig, setFaultSig] = useState(""); // "G:O2,CO2|P:ips"
  const prevFaultSigRef = useRef("");
  const [mutedIncidentSig, setMutedIncidentSig] = useState(
    () => localStorage.getItem("alarmMutedIncidentSig") || ""
  );

  // Unlock audio 1 lần
  useEffect(() => {
    const unlock = () => { try { ensureAudioCtx(); } catch {} };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Poll DUY NHẤT ở đây
  const loadAll = useCallback(() => {
    dispatch(fetchGas());
    dispatch(fetchPower());
  }, [dispatch]);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, Math.max(1, Number(pollIntervalSec)) * 1000);
    return () => clearInterval(id);
  }, [loadAll, pollIntervalSec]);

  // cập nhật chữ ký sự cố để beep
  useEffect(() => {
    const gasCodes = gas.filter((g) => g.fault).map((g) => g.code);
    const powKeys = power.filter((p) => p.fault).map((p) => p.key);
    const sigG = gasCodes.length ? `G:${gasCodes.sort().join(",")}` : "";
    const sigP = powKeys.length ? `P:${powKeys.sort().join(",")}` : "";
    setFaultSig([sigG, sigP].filter(Boolean).join("|"));
  }, [gas, power]);

  // Lắng nghe yêu cầu tắt tiếng ngay (từ nút "Tắt báo động IPS")
  useEffect(() => {
    const onMuteNow = () => {
      setMuted(true);
      localStorage.setItem("alarmMuted", "1");
      const sig = faultSig || "";
      setMutedIncidentSig(sig);
      if (sig) localStorage.setItem("alarmMutedIncidentSig", sig);
      else localStorage.removeItem("alarmMutedIncidentSig");
    };
    window.addEventListener("alarm:mute-now", onMuteNow);
    return () => window.removeEventListener("alarm:mute-now", onMuteNow);
  }, [faultSig]);

  // Phát tiếng định kỳ khi có lỗi & chưa mute
  useEffect(() => {
    let id;
    if (hasFault && !muted) {
      alarmBeepPattern();
      id = setInterval(alarmBeepPattern, 6000);
    }
    return () => id && clearInterval(id);
  }, [hasFault, muted]);

  // ❗ TỰ ĐỘNG BẬT TIẾNG khi có SỰ CỐ MỚI (khác incident trước)
  useEffect(() => {
    const prev = prevFaultSigRef.current;
    if (faultSig !== prev) {
      prevFaultSigRef.current = faultSig;

      // Khi hết lỗi hoàn toàn → reset "incident muted"
      if (!faultSig) {
        if (mutedIncidentSig !== "") {
          setMutedIncidentSig("");
          localStorage.removeItem("alarmMutedIncidentSig");
        }
        return;
      }

      // Nếu là lỗi MỚI (khác mutedIncidentSig đã ghi), tự động bật lại tiếng
      if (faultSig !== mutedIncidentSig) {
        setMuted(false);
        localStorage.setItem("alarmMuted", "0");
        // cập nhật incident sig để lần sau còn so sánh
        setMutedIncidentSig(faultSig);
        localStorage.setItem("alarmMutedIncidentSig", faultSig);
      }
    }
  }, [faultSig, mutedIncidentSig]);

  // Label
  let label = t("alarm.noFault", "No Fault");
  if (faultGas && faultPower) label = t("alarm.gasPowerFault", "Gas + Power Fault");
  else if (faultGas) label = t("alarm.gasFault", "Gas Fault");
  else if (faultPower) label = t("alarm.powerFault", "Power Fault");

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("alarmMuted", next ? "1" : "0");
    const sig = faultSig || "";
    setMutedIncidentSig(sig);
    if (sig) localStorage.setItem("alarmMutedIncidentSig", sig);
    else localStorage.removeItem("alarmMutedIncidentSig");
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
        title={muted ? t("alarm.unmute", "Unmute alarm") : t("alarm.mute", "Mute alarm")}
      >
        {muted ? t("alarm.muted", "Alarm Muted") : label}
      </button>
    </div>
  );
}
