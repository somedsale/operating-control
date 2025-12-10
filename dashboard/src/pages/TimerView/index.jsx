// src/pages/TimerTriple/index.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay, faPause, faXmark, faCheck, faRotateRight,
  faTriangleExclamation, faCircleCheck, faCircleExclamation,
  faKeyboard, faDeleteLeft
} from "@fortawesome/free-solid-svg-icons";
import NumericKeypad from "../../components/NumericKeypad";

/* ---------- Helpers ---------- */
const pad2 = (n) => String(Math.floor(n)).padStart(2, "0");
const toHM = (date, fmt = "24h") => {
  const H = date.getHours(); const M = date.getMinutes();
  if (fmt === "12h") {
    const h12 = H % 12 || 12; const suffix = H < 12 ? "AM" : "PM";
    return { hh: pad2(h12), mm: pad2(M), suffix };
  }
  return { hh: pad2(H), mm: pad2(M), suffix: "" };
};
const toHMS = (sec) => {
  const t = Math.max(0, Math.floor(sec));
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
};

/* ---------- API helper (đồng nhất với Right) ---------- */
function makeApiJson(base) {
  return async function apiJson(url, opts = {}) {
    const res = await fetch(`${base}${url}`, {
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  };
}
const normPoints = (payload) =>
  Array.isArray(payload?.points)
    ? payload.points.map((d) => ({ t: d.t, v: Number(d.v) }))
    : Array.isArray(payload)
    ? payload.map((d) => ({ t: d.t, v: Number(d.v) }))
    : [];

/* Chuẩn hoá mọi định dạng trả về của GET /api/devices */
function normalizeDevices(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.devices)) return resp.devices;
  if (Array.isArray(resp?.data)) return resp.data;
  return [];
}

/* ------- Tiny sparkline (SVG) ------- */
const Spark = ({ data = [], width = 200, height = 42, strokeWidth = 2, ariaLabel }) => {
  const { pts } = useMemo(() => {
    if (!data.length) return { pts: "" };
    const values = data.map(d => Number(d.v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-6, max - min);
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const pts = data.map((d, i) => {
      const x = i * stepX;
      const y = height - ((Number(d.v) - min) / span) * height;
      return `${x},${y}`;
    }).join(" ");
    return { pts };
  }, [data, width, height]);

  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel || "sparkline"} className="block">
      <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
      <polyline fill="none" stroke="#64748b" strokeWidth={strokeWidth} points={pts} vectorEffect="non-scaling-stroke" />
      {data.length > 0 && (
        <>
          <circle cx="2" cy={height - ((data[0].v - (Math.min(...data.map(d=>d.v)))) / Math.max(1e-6, (Math.max(...data.map(d=>d.v)) - Math.min(...data.map(d=>d.v))))) * height} r="2.5" fill="#334155" />
          <circle cx={width - 2} cy={height - ((data[data.length - 1].v - (Math.min(...data.map(d=>d.v)))) / Math.max(1e-6, (Math.max(...data.map(d=>d.v)) - Math.min(...data.map(d=>d.v))))) * height} r="2.5" fill="#334155" />
        </>
      )}
    </svg>
  );
};

/* ---------- Styles ---------- */
const styles = {
  date: "text-[clamp(16px,2vw,20px)] text-gray-600",
  caption: "text-[clamp(14px,2vw,18px)] text-gray-500",
  timeBig: "text-[clamp(60px,10vw,130px)] text-gray-700 leading-none font-light",
  cardBig: "text-[clamp(44px,6vw,96px)] leading-none font-semibold",
  colon: "text-[clamp(22px,3.4vw,46px)] mx-[0.25em]",
  red: "text-rose-600",
  blue: "text-blue-600",
  numWrap: "w-full inline-flex items-center justify-center whitespace-nowrap overflow-hidden leading-none px-2 sm:px-3",
  btn: "w-12 h-12 grid place-items-center border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98]",
  tinyBtn: "w-10 h-10 grid place-items-center border border-gray-300 rounded-md hover:bg-gray-50 active:scale-[0.98]",
  goBtn: "border border-gray-300 rounded-full px-5 py-2.5 text-gray-700 hover:bg-gray-50 text-[clamp(12px,1.6vw,16px)]",
  input: "w-24 outline-none text-center text-[clamp(12px,1.6vw,16px)]",
  hint: "mt-1 text-[clamp(11px,1.6vw,14px)] text-gray-400",
  kbdBtn: "text-[clamp(16px,3.2vw,22px)] font-semibold h-14 rounded-xl border border-gray-300 bg-white/70 hover:bg-white active:scale-[0.98]",
  kbdWide: "col-span-2",
};

/* ---------- Card shells ---------- */
const Card = ({ children, className = "" }) => (
  <div className={"bg-white/70 backdrop-blur rounded-2xl shadow-sm p-5 md:p-6 " + className}>
    {children}
  </div>
);

/* Stat tile (ENV) */
const StatTile = ({ label, value, unit, accent = "emerald", loading, error, footer, t }) => {
  const accentText =
    accent === "blue" ? "text-blue-600" :
    accent === "rose" ? "text-rose-600" :
    accent === "amber" ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="relative bg-white/70 backdrop-blur rounded-xl shadow-sm px-4 py-3 md:px-5 md:py-4 flex flex-col gap-1 min-h-[88px]">
      <div className="text-[clamp(11px,1.4vw,13px)] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className={`text-[clamp(22px,3.6vw,34px)] font-semibold ${accentText}`}>
          {Number.isFinite(value) ? value : (value ?? "--")}
        </div>
        <div className="text-[clamp(11px,1.6vw,14px)] text-gray-500">{unit}</div>
      </div>

      {footer}

      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-xl grid place-items-center">
          <svg className="animate-spin h-5 w-5 text-gray-500" viewBox="0 0 24 24" aria-label={t("Loading")}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
        </div>
      )}
      {error && !loading && (
        <div className="absolute top-2 right-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-[1px] flex items-center gap-1">
          <FontAwesomeIcon icon={faTriangleExclamation} /> {t("Error")}
        </div>
      )}
    </div>
  );
};

/* ---------- Medical Gas (compact) ---------- */
const ORDER = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];
const shapeGas = (raw) => {
  const by = {};
  (raw || []).forEach((it) => {
    const code = String(it?.code || it?.keyword || "").toUpperCase();
    const s = Number(it?.status);
    const status = Number.isFinite(s) ? s : 0; // 0=Normal, 1=High, 2=Low
    if (ORDER.includes(code)) by[code] = { code, status };
  });
  return ORDER.map((c) => by[c] ?? { code: c, status: 0 });
};

const AlarmCSS = () => (
  <style>{`
    @keyframes alarmInvert {
      0%,49% { background:#dc2626; color:#fff; border-color:#dc2626; }
      50%,100% { background:#fff; color:#111; border-color:#dc2626; }
    }
    .alarm-invert { animation: alarmInvert 1s linear infinite; }
  `}</style>
);

const GasBadge = ({ code, status, t }) => {
  const s = Number(status);
  const fault = s !== 0; // khác 0 là lỗi (đồng nhất view alarm)

  return (
    <div
      className={[
        "h-9 px-3 rounded-full text-[12px] font-semibold border select-none",
        fault ? "alarm-invert" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      ].join(" ")}
      title={code}
      role="status"
      aria-label={`${code} ${fault ? t("Fault") : t("Normal")}`}
    >
      <div className="h-full flex items-center gap-1.5">
        <span>{code}</span>
        <span className="inline-flex items-center gap-1 text-[11px]">
          <FontAwesomeIcon icon={fault ? faCircleExclamation : faCircleCheck} />
          {fault ? t("Fault") : t("OK")}
        </span>
      </div>
    </div>
  );
};

/* ---------- TapCard (Devices on right) ---------- */
const TapCard = ({ title, sub, pressed, disabled, loading, onClick, loadingImg, t }) => (
  <div className="relative">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={!!pressed}
      className={[
        "group w-full text-left rounded-2xl transition transform",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200",
        "active:scale-[0.99]",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        pressed ? "bg-emerald-600 text-white shadow-md"
                : "bg-white/80 text-slate-800 shadow-sm hover:shadow-md",
        "p-5 md:p-6",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h3 className="text-[clamp(16px,1.9vw,22px)] font-semibold tracking-wide capitalize">
            {title}
          </h3>
          {sub ? (
            <span className={pressed ? "text-emerald-100" : "text-slate-500"}>
              {sub}
            </span>
          ) : null}
        </div>
        <span
          className={[
            "inline-flex items-center justify-center rounded-xl px-3 h-9 text-sm font-semibold",
            pressed
              ? "bg-white/15 text-white border border-white/20"
              : "bg-emerald-600/10 text-emerald-700 border border-emerald-600/20",
          ].join(" ")}
          aria-live="polite"
        >
          {pressed ? t("ON") : t("OFF")}
        </span>
      </div>
    </button>

    {loading && (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          <img
            src={loadingImg}
            alt={t("Saving…")}
            className="h-8 w-8"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
          <span className="text-sm text-emerald-700 font-medium">{t("Saving…")}</span>
        </div>
      </div>
    )}
  </div>
);

/* ---------- Component ---------- */
export default function TimerTriple() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  const timeFormat = useSelector((s) => s?.settings?.timeFormat ?? s?.settings?.value?.timeFormat ?? "24h");
  const apiBase = useSelector((s) => s?.settings?.apiBaseUrl || "http://localhost:5000");
  const apiBaseJson = useMemo(() => makeApiJson(apiBase), [apiBase]);

  // Ảnh loading local
  const LOADING_IMG = `${process.env.PUBLIC_URL || ""}/assets/loading.png`;

  /* Current time */
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const { hh: nowHH, mm: nowMM, suffix } = toHM(now, timeFormat);
  const dateLine = now.toLocaleDateString(i18n.language, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  /* Timers */
  const [surgSec, setSurgSec] = useState(0);
  const [surgRun, setSurgRun] = useState(false);
  const DEFAULT_MIN = 30;
  const [anesMinsInput, setAnesMinsInput] = useState(DEFAULT_MIN);
  const [anesStart, setAnesStart] = useState(DEFAULT_MIN * 60);
  const [anesLeft, setAnesLeft] = useState(DEFAULT_MIN * 60);
  const [anesRun, setAnesRun] = useState(false);

  // Keypad modal
  const [kpOpen, setKpOpen] = useState(false);
  const openKeypad = () => setKpOpen(true);
  const closeKeypad = () => setKpOpen(false);
  const applyKeypadMinutes = (mins) => {
    setAnesMinsInput(mins);
    if (Number.isFinite(mins) && mins > 0) {
      const secs = Math.round(mins * 60);
      setAnesStart(secs);
      setAnesLeft(secs);
      setAnesRun(false);
    }
  };

  /* ====== AUDIO: cảnh báo countdown ====== */
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const initAudio = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioRef.current) audioRef.current = new AC();
      if (audioRef.current.state === "suspended") audioRef.current.resume();
      audioUnlockedRef.current = true;
    } catch {}
  };
  const beep = (freq = 880, ms = 200, type = "sine", gain = 0.05) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.value = 0.0001;
    osc.connect(g); g.connect(ctx.destination);
    const t0 = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    osc.start(t0);
    const dur = ms / 1000;
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.stop(t0 + dur + 0.02);
  };
  const prevLeftRef = useRef(anesLeft);
  useEffect(() => {
    const prev = prevLeftRef.current;
    const prevInt = Math.ceil(prev);
    const currInt = Math.ceil(anesLeft);
    if (currInt < prevInt && audioUnlockedRef.current) {
      if (prevInt > 60 && currInt <= 60) { initAudio(); beep(660, 300, "sine", 0.06); }
      if (currInt <= 10 && currInt > 0) { initAudio(); beep(950, 130, "square", 0.06); }
      if (currInt === 0 && prevInt > 0) {
        initAudio();
        beep(600, 180, "sine", 0.07);
        setTimeout(() => beep(600, 180, "sine", 0.07), 250);
        setTimeout(() => beep(600, 320, "sine", 0.08), 550);
      }
    }
    prevLeftRef.current = anesLeft;
  }, [anesLeft]);

  /* ========= ENV stats + HISTORY ========= */
  const [stats, setStats] = useState({
    temp: { v: null, loading: false, error: false },
    humi: { v: null, loading: false, error: false },
    pFilter: { v: null, loading: false, error: false },
    pRoom: { v: null, loading: false, error: false },
    updatedAt: null,
  });
  const [histTemp, setHistTemp] = useState([]);
  const [histHumd, setHistHumd] = useState([]);
  const [histPFilter, setHistPFilter] = useState([]);
  const [histPRoom, setHistPRoom] = useState([]);



const loadStats = useCallback(async () => {
  setStats((s) => ({
    ...s,
    temp:    { ...s.temp,    loading: true, error: false },
    humi:    { ...s.humi,    loading: true, error: false },
    pFilter: { ...s.pFilter, loading: true, error: false },
    pRoom:   { ...s.pRoom,   loading: true, error: false },
  }));
  try {
    // ✅ API giống Right: /api/sensor/ai/live -> { ok, channels:{ ch1..ch4:{value} } }
    const live = await apiBaseJson("/api/sensor/ai/live");
    if (!live?.ok) throw new Error("PLC live data not ok");
    const ch = live.channels || {};
    const tempVal = Number(ch?.ch1?.value);
    const humiVal = Number(ch?.ch2?.value);
    const pfVal   = Number(ch?.ch3?.value);
    const prVal   = Number(ch?.ch4?.value);

    setStats({
      temp:    { v: Number.isFinite(tempVal) ? tempVal : null, loading: false, error: !Number.isFinite(tempVal) },
      humi:    { v: Number.isFinite(humiVal) ? humiVal : null, loading: false, error: !Number.isFinite(humiVal) },
      pFilter: { v: Number.isFinite(pfVal)   ? pfVal   : null, loading: false, error: !Number.isFinite(pfVal) },
      pRoom:   { v: Number.isFinite(prVal)   ? prVal   : null, loading: false, error: !Number.isFinite(prVal) },
      updatedAt: new Date(),
    });
  } catch (e) {
    const msg = e?.message || "loadStats error";
    dispatch(fetchDataFailure(msg));
    setStats((s) => ({
      temp:    { ...s.temp,    loading: false, error: true },
      humi:    { ...s.humi,    loading: false, error: true },
      pFilter: { ...s.pFilter, loading: false, error: true },
      pRoom:   { ...s.pRoom,   loading: false, error: true },
      updatedAt: s.updatedAt,
    }));
  }
}, [apiBaseJson, dispatch]);


const loadHistory = useCallback(async () => {
  try {
    // ✅ giống Right: gọi từng metric
    const [tempJson, humJson] = await Promise.all([
      apiBaseJson("/api/sensor/history?metric=temp&bucketSec=60"),
      apiBaseJson("/api/sensor/history?metric=humidity&bucketSec=60"),
    ]);
    setHistTemp(normPoints(tempJson));
    setHistHumd(normPoints(humJson));
  } catch (e) {
    const msg = e?.message || "loadHistory error";
    dispatch(fetchDataFailure(msg));
  }
}, [apiBaseJson, dispatch]);


const loadPressureHistory = useCallback(async () => {
  try {
    // ✅ giống Right
    const [fJson, rJson] = await Promise.all([
      apiBaseJson("/api/sensor/pressure/filter/history"),
      apiBaseJson("/api/sensor/pressure/room/history"),
    ]);
    setHistPFilter(normPoints(fJson));
    setHistPRoom(normPoints(rJson));
  } catch (e) {
    const msg = e?.message || "loadPressureHistory error";
    dispatch(fetchDataFailure(msg));
  }
}, [apiBaseJson, dispatch]);


  useEffect(() => {
    loadStats(); loadHistory(); loadPressureHistory();
    const tick = setInterval(() => { loadStats(); }, 5000);
    const histTick = setInterval(() => { loadHistory(); loadPressureHistory(); }, 60000);
    return () => { clearInterval(tick); clearInterval(histTick); };
  }, [loadStats, loadHistory, loadPressureHistory]);

  /* Medical gas (compact) */
  const [gas, setGas] = useState(ORDER.map((c) => ({ code: c, status: 0 })));
  const [gasErr, setGasErr] = useState("");
  const [gasUpdatedAt, setGasUpdatedAt] = useState(null);
  const loadGas = useCallback(async () => {
    try {
      setGasErr("");
      const res = await apiBaseJson("/api/gas");
      const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setGas(shapeGas(arr)); setGasUpdatedAt(new Date());
    } catch (e) {
      const msg = e?.message || "Failed to load gas";
      setGasErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  }, [apiBaseJson, dispatch]);
  useEffect(() => {
    loadGas();
    const id = setInterval(loadGas, 10000);
    return () => clearInterval(id);
  }, [loadGas]);

  /* ========== DEVICES (GIỐNG Control) ========== */
  const DEV_ITEMS = [
    { id: "in_use",          nameKey: "use" },
    { id: "operating_lamp",  nameKey: "operating lamp" },
    { id: "xray",            nameKey: "x-ray" },
    { id: "uv",              nameKey: "UV Lamp" },
    { id: "heat_lamp",       nameKey: "heating lamp" },
    { id: "general_light",   nameKey: "General Light" },
  ];
  const [dev, setDev] = useState(DEV_ITEMS.map(d => ({ ...d, on: false })));
  const [devSavingId, setDevSavingId] = useState(null);
  const [devErr, setDevErr] = useState("");

  const loadDevices = useCallback(async () => {
    try {
      setDevErr("");
      const resp = await apiBaseJson("/api/devices");
      const list = normalizeDevices(resp);
      const byId = Object.fromEntries(list.map(d => [d.deviceId, d]));
      setDev(DEV_ITEMS.map(d => {
        const row = byId[d.id] || {};
        const on = (row.isOn ?? row.hwOn ?? row.on ?? false) ? true : false;
        const name = row.name || d.nameKey;
        return { ...d, on, customName: name };
      }));
    } catch (e) {
      const msg = e?.message || t("Load devices failed");
      setDevErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  }, [apiBaseJson, t, dispatch]);

  useEffect(() => { loadDevices(); }, [loadDevices]);
  useEffect(() => {
    const id = setInterval(loadDevices, 10000);
    return () => clearInterval(id);
  }, [loadDevices]);

  const toggleDevice = (id) => async () => {
    const idx = dev.findIndex(d => d.id === id);
    if (idx < 0) return;
    const next = !dev[idx].on;

    setDev(arr => arr.map((it, i) => i === idx ? { ...it, on: next } : it));
    setDevSavingId(id);
    setDevErr("");
    try {
      await apiBaseJson(`/api/devices/${id}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: next }),
      });
    } catch (e) {
      const msg = e?.message || t("Update device failed");
      setDev(arr => arr.map((it, i) => i === idx ? { ...it, on: !next } : it)); // rollback
      setDevErr(msg);
      dispatch(fetchDataFailure(msg));
    } finally {
      setDevSavingId(null);
    }
  };

  /* RAF loop for timers */
  const raf = useRef(null); const lastTs = useRef(null);
  useEffect(() => {
    const loop = (ts) => {
      if (!surgRun && !anesRun) return;
      if (!lastTs.current) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000; lastTs.current = ts;
      if (surgRun) setSurgSec((v) => v + dt);
      if (anesRun) setAnesLeft((v) => (v - dt <= 0 ? (setAnesRun(false), 0) : v - dt));
      raf.current = requestAnimationFrame(loop);
    };
    if (surgRun || anesRun) raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = null; lastTs.current = null; };
  }, [surgRun, anesRun]);

  /* Handlers */
  const sH = toHMS(surgSec); const aH = toHMS(Math.ceil(anesLeft));
  const surgPlay = () => { initAudio(); lastTs.current = null; setSurgRun(true); };
  const surgPause = () => { lastTs.current = null; setSurgRun(false); };
  const surgReset = () => { lastTs.current = null; setSurgRun(false); setSurgSec(0); };
  const applyAnesMinutes = () => {
    const m = Number(anesMinsInput);
    if (Number.isFinite(m) && m > 0) {
      const secs = Math.round(m * 60);
      lastTs.current = null;
      setAnesStart(secs); setAnesLeft(secs); setAnesRun(false);
    }
  };
  const anesPlay   = () => { initAudio(); if (anesLeft <= 0) setAnesLeft(anesStart); lastTs.current = null; setAnesRun(true); };
  const anesPause  = () => { lastTs.current = null; setAnesRun(false); };
  const anesReset  = () => { lastTs.current = null; setAnesRun(false); setAnesLeft(anesStart); };
  const playBoth   = () => { initAudio(); if (anesLeft <= 0) setAnesLeft(anesStart); lastTs.current = null; setSurgRun(true); setAnesRun(true); };
  const pauseBoth  = () => { lastTs.current = null; setSurgRun(false); setAnesRun(false); };
  const resetBoth  = () => { lastTs.current = null; setSurgRun(false); setSurgSec(0); setAnesRun(false); setAnesLeft(anesStart); };

  /* ---------- Render ---------- */
  return (
    <div className="mx-auto max-w-8xl w-full px-4 md:px-6 py-5">
      <AlarmCSS />

      {/* Header */}
      <div className="grid grid-cols-3 items-center mb-4 md:mb-6">
        <div className="justify-self-start">
          <div className={styles.date}>{dateLine}</div>
        </div>
        <div className="justify-self-center">
          <NavLink to="/lighting">
            <div className={styles.goBtn}>{t("Go to Control").toUpperCase()}</div>
          </NavLink>
        </div>
        <div className="justify-self-end text-sm text-gray-400" />
      </div>

      {/* GRID 3 CỘT */}
      <div className="grid grid-cols-12 gap-5 md:gap-6">
        {/* LEFT: ENV */}
        <div className="col-span-12 lg:col-span-2 space-y-5 md:space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <StatTile
              t={t}
              label={t("Temperature")}
              value={Number.isFinite(stats.temp.v) ? stats.temp.v.toFixed(1) : stats.temp.v}
              unit="°C"
              accent="rose"
              loading={stats.temp.loading}
              error={stats.temp.error}
              footer={<div className="mt-2"><Spark data={histTemp} ariaLabel={t("Temperature trend")} /></div>}
            />
            <StatTile
              t={t}
              label={t("Humidity")}
              value={Number.isFinite(stats.humi.v) ? stats.humi.v.toFixed(0) : stats.humi.v}
              unit="%"
              accent="blue"
              loading={stats.humi.loading}
              error={stats.humi.error}
              footer={<div className="mt-2"><Spark data={histHumd} ariaLabel={t("Humidity trend")} /></div>}
            />
            <StatTile
              t={t}
              label={t("Filter Pressure")}
              value={Number.isFinite(stats.pFilter.v) ? stats.pFilter.v.toFixed(0) : stats.pFilter.v}
              unit={t("Pa")}
              accent="amber"
              loading={stats.pFilter.loading}
              error={stats.pFilter.error}
              footer={<div className="mt-2"><Spark data={histPFilter} ariaLabel={t("Filter pressure trend")} /></div>}
            />
            <StatTile
              t={t}
              label={t("Room Pressure")}
              value={Number.isFinite(stats.pRoom.v) ? stats.pRoom.v.toFixed(0) : stats.pRoom.v}
              unit={t("Pa")}
              accent="emerald"
              loading={stats.pRoom.loading}
              error={stats.pRoom.error}
              footer={<div className="mt-2"><Spark data={histPRoom} ariaLabel={t("Room pressure trend")} /></div>}
            />
          </div>

          <div className="text-right">
            {stats.updatedAt && (
              <span className="ml-3 text-sm text-gray-400">
                {t("Updated")}: {stats.updatedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* CENTER: 3 phần thời gian (giữa) */}
        <div className="col-span-12 lg:col-span-7 space-y-5 md:space-y-6">
          {/* Current Time */}
          <Card className="text-center">
            <div className="inline-flex items-baseline">
              <div className={styles.timeBig}>
                {nowHH}<span className="px-2">:</span>{nowMM}
              </div>
              {timeFormat === "12h" && (
                <span className="ml-3 text-[clamp(16px,2vw,22px)] text-gray-600">{suffix}</span>
              )}
            </div>
            <div className={styles.caption}>{t("Current Time")}</div>
          </Card>

          {/* Control Both */}
          <Card className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="px-5 py-3 rounded-xl border border-gray-200 bg-white/60 flex items-center gap-3">
                <span className="text-gray-700 text-sm md:text-base">{t("Control Both")}</span>
                <button onClick={playBoth}  className={styles.btn} title={t("Play both")}><FontAwesomeIcon icon={faPlay} /></button>
                <button onClick={pauseBoth} className={styles.btn} title={t("Pause both")}><FontAwesomeIcon icon={faPause} /></button>
                <button onClick={resetBoth} className={styles.btn} title={t("Reset both")}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
            </div>
          </Card>

          {/* Two timers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {/* Surgery Time */}
            <Card className="text-center">
              <div className={styles.numWrap}>
                <span className={`${styles.cardBig} ${styles.red}`}>{pad2(sH.h)}</span>
                <span className={styles.colon}>:</span>
                <span className={`${styles.cardBig} ${styles.red}`}>{pad2(sH.m)}</span>
                <span className={styles.colon}>:</span>
                <span className={`${styles.cardBig} ${styles.red}`}>{pad2(sH.s)}</span>
              </div>
              <div className={styles.caption}>{t("Surgery Time")}</div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <button onClick={surgPlay}  className={styles.btn} title={t("Play")}><FontAwesomeIcon icon={faPlay} /></button>
                <button onClick={surgPause} className={styles.btn} title={t("Pause")}><FontAwesomeIcon icon={faPause} /></button>
                <button onClick={surgReset} className={styles.btn} title={t("Reset")}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
            </Card>

            {/* Anesthesia Countdown */}
            <Card className="text-center">
              <div className={styles.numWrap}>
                <span className={`${styles.cardBig} ${styles.blue}`}>{pad2(aH.h)}</span>
                <span className={styles.colon}>:</span>
                <span className={`${styles.cardBig} ${styles.blue}`}>{pad2(aH.m)}</span>
                <span className={styles.colon}>:</span>
                <span className={`${styles.cardBig} ${styles.blue}`}>{pad2(aH.s)}</span>
              </div>
              <div className={styles.caption}>{t("Anesthesia Countdown")}</div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    inputMode="none"
                    readOnly
                    value={anesMinsInput}
                    onClick={() => setKpOpen(true)}
                    className={styles.input}
                    aria-label={t("Minutes")}
                    title={t("Tap to enter")}
                  />
                  <span className="text-gray-500 text-[clamp(12px,1.6vw,14px)]">{t("minutes")}</span>
                  <button onClick={() => setKpOpen(true)} className={styles.tinyBtn} title={t("Open keypad")} aria-label={t("Open keypad")}>
                    <FontAwesomeIcon icon={faKeyboard} />
                  </button>
                  <button onClick={applyAnesMinutes} className={styles.tinyBtn} title={t("Apply")}>
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                </div>
                <button onClick={anesPlay}  className={styles.btn} title={t("Play")}><FontAwesomeIcon icon={faPlay} /></button>
                <button onClick={anesPause} className={styles.btn} title={t("Pause")}><FontAwesomeIcon icon={faPause} /></button>
                <button onClick={anesReset} className={styles.btn} title={t("Reset")}><FontAwesomeIcon icon={faXmark} /></button>
              </div>
              {!anesRun && anesLeft === anesStart && (
                <div className={styles.hint}>{t("Set minutes, then press Play.")}</div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT: Devices + Medical Gas */}
        <div className="col-span-12 lg:col-span-3 space-y-5 md:space-y-6">
          {/* Devices grid */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[clamp(14px,1.8vw,18px)] font-semibold text-slate-700">{t("Devices")}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dev.map(d => {
                const title = t(`device.${d.id}`, {
                  defaultValue: t(d.nameKey, {
                    defaultValue: t(d.customName || "", {
                      defaultValue: d.customName || d.nameKey || d.id,
                    }),
                  }),
                });
                return (
                  <TapCard
                    key={d.id}
                    title={title}
                  sub={d.on ? t("Tap to turn OFF") : t("Tap to turn ON")}
                  pressed={d.on}
                  disabled={devSavingId === d.id}
                  loading={devSavingId === d.id}
                  loadingImg={LOADING_IMG}
                  t={t}
                  onClick={toggleDevice(d.id)}
                  />
                );
              })}
            </div>
            {!!devErr && <div className="mt-2 text-sm text-rose-700">{devErr}</div>}
          </Card>

          {/* MEDICAL GAS — COMPACT */}
          <Card>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[clamp(14px,1.8vw,18px)] font-semibold text-slate-700">{t("Medical Gas")}</div>
              <div className="flex items-center gap-3">
                {gasErr && <span className="text-sm text-rose-600">{gasErr}</span>}
                <button onClick={loadGas} className="border border-gray-300 rounded-full px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2" title={t("Refresh")}>
                  <FontAwesomeIcon icon={faRotateRight} /> {t("Refresh")}
                </button>
                {gasUpdatedAt && (
                  <span className="text-xs text-gray-400">{t("Updated")}: {gasUpdatedAt.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {gas.map((g) => (<GasBadge key={g.code} code={g.code} status={g.status} t={t} />))}
            </div>
          </Card>
        </div>
      </div>

      {/* Numeric Keypad Modal */}
      <NumericKeypad  
        open={kpOpen}
        initial={anesMinsInput}
        onClose={() => setKpOpen(false)}
        onApply={applyKeypadMinutes}
        t={t}
      />
    </div>
  );
}
