// src/pages/TimerTriple/index.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay, faPause, faXmark, faCheck, faRotateRight,
  faTriangleExclamation, faCircleCheck, faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";

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

// API helper (prefix bằng apiBase từ Settings)
function makeApiJson(base) {
  return async function apiJson(url, opts) {
    const res = await fetch(`${base}${url}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  };
}

/* ------- Tiny sparkline (SVG) ------- */
const Spark = ({ data = [], width = 200, height = 42, strokeWidth = 2, ariaLabel }) => {
  // data: [{t: ISO, v: number}]
  const { min, max, pts } = useMemo(() => {
    if (!data.length) return { min: 0, max: 1, pts: "" };
    const values = data.map(d => Number(d.v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-6, max - min);
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const pts = data
      .map((d, i) => {
        const x = i * stepX;
        const y = height - ((Number(d.v) - min) / span) * height; // 0 -> bottom
        return `${x},${y}`;
      })
      .join(" ");
    return { min, max, pts };
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
  btn: "w-12 h-12 grid place-items-center border border-gray-300 rounded-lg hover:bg-gray-50",
  tinyBtn: "w-10 h-10 grid place-items-center border border-gray-300 rounded-md hover:bg-gray-50",
  goBtn: "border border-gray-300 rounded-full px-5 py-2.5 text-gray-700 hover:bg-gray-50 text-[clamp(12px,1.6vw,16px)]",
  input: "w-24 outline-none text-center text-[clamp(12px,1.6vw,16px)]",
  hint: "mt-1 text-[clamp(11px,1.6vw,14px)] text-gray-400",
};

/* ---------- Card shells ---------- */
const Card = ({ children, className = "" }) => (
  <div className={"bg-white/70 backdrop-blur rounded-2xl shadow-sm p-5 md:p-6 " + className}>
    {children}
  </div>
);

/* Stat tile (ENV) */
const StatTile = ({ label, value, unit, accent = "emerald", loading, error, footer }) => {
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
          <svg className="animate-spin h-5 w-5 text-gray-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
        </div>
      )}
      {error && !loading && (
        <div className="absolute top-2 right-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-[1px] flex items-center gap-1">
          <FontAwesomeIcon icon={faTriangleExclamation} /> Error
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
    const status = Number.isFinite(Number(it?.status)) ? Number(it.status) : 0;
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
const GasBadge = ({ code, status }) => {
  const fault = status === 1;
  return (
    <div
      className={[
        "h-9 px-3 rounded-full text-[12px] font-semibold border select-none",
        fault ? "alarm-invert" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      ].join(" ")}
      title={code}
      role="status"
      aria-label={`${code} ${fault ? "Fault" : "Normal"}`}
    >
      <div className="h-full flex items-center gap-1.5">
        <span>{code}</span>
        <span className="inline-flex items-center gap-1 text-[11px]">
          <FontAwesomeIcon icon={fault ? faCircleExclamation : faCircleCheck} />
          {fault ? "Fault" : "OK"}
        </span>
      </div>
    </div>
  );
};

/* ---------- TapCard (Devices on right) ---------- */
const TapCard = ({ title, sub, pressed, disabled, loading, onClick }) => (
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
        >
          {pressed ? "ON" : "OFF"}
        </span>
      </div>
    </button>

    {loading && (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-6 w-6 text-emerald-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
          <span className="text-sm text-emerald-700 font-medium">Saving…</span>
        </div>
      </div>
    )}
  </div>
);

/* ---------- Component ---------- */
export default function TimerTriple() {
  const { t, i18n } = useTranslation();
  const timeFormat = useSelector((s) => s?.settings?.timeFormat ?? s?.settings?.value?.timeFormat ?? "24h");
  const apiBase = useSelector((s) => s?.settings?.apiBaseUrl || "http://localhost:5000");
  const apiJson = useMemo(() => makeApiJson(apiBase), [apiBase]);

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

  /* ====== AUDIO: cảnh báo countdown ====== */
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const initAudio = () => {
    try {
      if (!audioRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioRef.current = new AC();
      }
      if (audioRef.current.state === "suspended") {
        audioRef.current.resume();
      }
      audioUnlockedRef.current = true;
    } catch {/* ignore */}
  };
  const beep = (freq = 880, ms = 200, type = "sine", gain = 0.05) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = 0.0001;
    osc.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    osc.start(t);
    const dur = ms / 1000;
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.stop(t + dur + 0.02);
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

  /* ========= ENV stats + HISTORY (giống Right) ========= */
  const [stats, setStats] = useState({
    temp: { v: null, loading: false, error: false },
    humi: { v: null, loading: false, error: false },
    pFilter: { v: null, loading: false, error: false },
    pRoom: { v: null, loading: false, error: false },
    updatedAt: null,
  });
  const [histTemp, setHistTemp] = useState([]);   // [{t,v}]
  const [histHumd, setHistHumd] = useState([]);   // [{t,v}]
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
      const [lastTH, pf, pr] = await Promise.allSettled([
        apiJson("/api/sensor/last"),                // -> { temp, humidity }
        apiJson("/api/sensor/pressure/filter"),     // -> number | { value }
        apiJson("/api/sensor/pressure/room"),       // -> number | { value }
      ]);
      const tempVal = lastTH.status === "fulfilled" ? Number(lastTH.value?.temp) : null;
      const humiVal = lastTH.status === "fulfilled" ? Number(lastTH.value?.humidity) : null;
      const pfVal   = pf.status    === "fulfilled" ? Number(pf.value?.value ?? pf.value) : null;
      const prVal   = pr.status    === "fulfilled" ? Number(pr.value?.value ?? pr.value) : null;

      setStats({
        temp:    { v: Number.isFinite(tempVal) ? tempVal : null, loading: false, error: lastTH.status !== "fulfilled" },
        humi:    { v: Number.isFinite(humiVal) ? humiVal : null, loading: false, error: lastTH.status !== "fulfilled" },
        pFilter: { v: Number.isFinite(pfVal)   ? pfVal   : null, loading: false, error: pf.status !== "fulfilled" },
        pRoom:   { v: Number.isFinite(prVal)   ? prVal   : null, loading: false, error: pr.status !== "fulfilled" },
        updatedAt: new Date(),
      });
    } catch {
      setStats((s) => ({
        temp:    { ...s.temp,    loading: false, error: true },
        humi:    { ...s.humi,    loading: false, error: true },
        pFilter: { ...s.pFilter, loading: false, error: true },
        pRoom:   { ...s.pRoom,   loading: false, error: true },
        updatedAt: s.updatedAt,
      }));
    }
  }, [apiJson]);

  const loadHistory = useCallback(async () => {
    try {
      const json = await apiJson("/api/sensor/history?metric=all&bucketSec=60");
      const norm = (arr) => Array.isArray(arr) ? arr.map((d) => ({ t: d.t, v: Number(d.v) })) : [];
      setHistTemp(norm(json?.temp));
      setHistHumd(norm(json?.humidity));
    } catch { /* silent */ }
  }, [apiJson]);

  const loadPressureHistory = useCallback(async () => {
    try {
      const [fJson, rJson] = await Promise.all([
        apiJson("/api/sensor/pressure/history?kind=filter&bucketSec=60"),
        apiJson("/api/sensor/pressure/history?kind=room&bucketSec=60"),
      ]);
      const norm = (arr) => Array.isArray(arr) ? arr.map((d) => ({ t: d.t, v: Number(d.v) })) : [];
      setHistPFilter(norm(fJson?.points || fJson));
      setHistPRoom(norm(rJson?.points || rJson));
    } catch { /* silent */ }
  }, [apiJson]);

  // Polling giống Right
  useEffect(() => {
    // lần đầu
    loadStats();
    loadHistory();
    loadPressureHistory();

    // current values: 5s
    const tick = setInterval(() => {
      loadStats();
    }, 5000);

    // histories: 60s
    const histTick = setInterval(() => {
      loadHistory();
      loadPressureHistory();
    }, 60000);

    return () => {
      clearInterval(tick);
      clearInterval(histTick);
    };
  }, [loadStats, loadHistory, loadPressureHistory]);

  /* Medical gas (compact) */
  const [gas, setGas] = useState(ORDER.map((c) => ({ code: c, status: 0 })));
  const [gasErr, setGasErr] = useState("");
  const [gasUpdatedAt, setGasUpdatedAt] = useState(null);
  const loadGas = useCallback(async () => {
    try {
      setGasErr("");
      const res = await apiJson("/api/gas");
      const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setGas(shapeGas(arr)); setGasUpdatedAt(new Date());
    } catch (e) { setGasErr(e?.message || "Failed to load gas"); }
  }, [apiJson]);
  useEffect(() => {
    loadGas();
    const id = setInterval(loadGas, 10000);
    return () => clearInterval(id);
  }, [loadGas]);

  /* Devices (right column) */
  const DEV_ITEMS = [
    { id: "in_use",          label: "use" },
    { id: "operating_lamp",  label: "operating lamp" },
    { id: "xray",            label: "x-ray" },
    { id: "uv",              label: "uv" },
    { id: "heat_lamp",       label: "heating lamp" },
    { id: "general_light",   label: "Genaral Light" },
  ];
  const [dev, setDev] = useState(DEV_ITEMS.map(d => ({ ...d, on: false })));
  const [devLoading, setDevLoading] = useState(false);
  const [devSavingId, setDevSavingId] = useState(null);
  const [devErr, setDevErr] = useState("");
  const loadDevices = useCallback(async () => {
    try {
      setDevLoading(true); setDevErr("");
      const list = await apiJson("/api/devices"); // [{deviceId,isOn,hwOn,name}]
      const byId = Object.fromEntries(list.map(d => [d.deviceId, d]));
      setDev(DEV_ITEMS.map(d => {
        const row = byId[d.id];
        const on = typeof row?.hwOn === "boolean" ? row.hwOn
                : typeof row?.isOn === "boolean" ? row.isOn : false;
        const name = row?.name || d.label;
        return { ...d, name, on };
      }));
    } catch (e) {
      setDevErr(e.message || "Load devices failed");
    } finally {
      setDevLoading(false);
    }
  }, [apiJson]);
  useEffect(() => { loadDevices(); }, [loadDevices]);
  const toggleDevice = (id) => async () => {
    const idx = dev.findIndex(d => d.id === id);
    if (idx < 0) return;
    const next = !dev[idx].on;
    setDev(arr => arr.map((it, i) => i === idx ? { ...it, on: next } : it));
    setDevSavingId(id);
    try {
      await apiJson(`/api/devices/${id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: next }),
      });
    } catch (e) {
      setDev(arr => arr.map((it, i) => i === idx ? { ...it, on: !next } : it));
      setDevErr(e.message || "Update device failed");
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
            <div className={styles.goBtn}>{("Go to Control").toUpperCase()}</div>
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
              label="Temperature"
              value={Number.isFinite(stats.temp.v) ? stats.temp.v.toFixed(1) : stats.temp.v}
              unit="°C"
              accent="rose"
              loading={stats.temp.loading}
              error={stats.temp.error}
              footer={
                <div className="mt-2">
                  <Spark data={histTemp} ariaLabel="Temperature trend" />
                </div>
              }
            />
            <StatTile
              label="Humidity"
              value={Number.isFinite(stats.humi.v) ? stats.humi.v.toFixed(0) : stats.humi.v}
              unit="%"
              accent="blue"
              loading={stats.humi.loading}
              error={stats.humi.error}
              footer={
                <div className="mt-2">
                  <Spark data={histHumd} ariaLabel="Humidity trend" />
                </div>
              }
            />
            <StatTile
              label="Filter Pressure"
              value={Number.isFinite(stats.pFilter.v) ? stats.pFilter.v.toFixed(0) : stats.pFilter.v}
              unit="Pa"
              accent="amber"
              loading={stats.pFilter.loading}
              error={stats.pFilter.error}
              footer={
                <div className="mt-2">
                  <Spark data={histPFilter} ariaLabel="Filter pressure trend" />
                </div>
              }
            />
            <StatTile
              label="Room Pressure"
              value={Number.isFinite(stats.pRoom.v) ? stats.pRoom.v.toFixed(0) : stats.pRoom.v}
              unit="Pa"
              accent="emerald"
              loading={stats.pRoom.loading}
              error={stats.pRoom.error}
              footer={
                <div className="mt-2">
                  <Spark data={histPRoom} ariaLabel="Room pressure trend" />
                </div>
              }
            />
          </div>

          <div className="text-right">
            <button onClick={() => { loadStats(); loadHistory(); loadPressureHistory(); }} className="border border-gray-300 rounded-full px-4 py-2 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2" title="Refresh">
              <FontAwesomeIcon icon={faRotateRight} /> Refresh ENV
            </button>
            {stats.updatedAt && (
              <span className="ml-3 text-sm text-gray-400">Updated: {stats.updatedAt.toLocaleTimeString()}</span>
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
            <div className={styles.caption}>Current Time</div>
          </Card>

          {/* Control Both */}
          <Card className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="px-5 py-3 rounded-xl border border-gray-200 bg-white/60 flex items-center gap-3">
                <span className="text-gray-700 text-sm md:text-base">Control Both</span>
                <button onClick={playBoth}  className={styles.btn} title="Play both"><FontAwesomeIcon icon={faPlay} /></button>
                <button onClick={pauseBoth} className={styles.btn} title="Pause both"><FontAwesomeIcon icon={faPause} /></button>
                <button onClick={resetBoth} className={styles.btn} title="Reset both"><FontAwesomeIcon icon={faXmark} /></button>
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
              <div className={styles.caption}>Surgery Time</div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <button onClick={surgPlay}  className={styles.btn} title="Play"><FontAwesomeIcon icon={faPlay} /></button>
                <button onClick={surgPause} className={styles.btn} title="Pause"><FontAwesomeIcon icon={faPause} /></button>
                <button onClick={surgReset} className={styles.btn} title="Reset"><FontAwesomeIcon icon={faXmark} /></button>
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
              <div className={styles.caption}>Anesthesia Countdown</div>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2 py-1">
                  <input
                    type="number" min="1" step="1"
                    value={anesMinsInput}
                    onChange={(e) => setAnesMinsInput(e.target.value)}
                    className={styles.input}
                  />
                  <span className="text-gray-500 text-[clamp(12px,1.6vw,14px)]">minutes</span>
                  <button onClick={applyAnesMinutes} className={styles.tinyBtn} title="Apply">
                    <FontAwesomeIcon icon={faCheck} />
                  </button>
                </div>
                <button onClick={anesPlay}  className={styles.btn} title="Play"><FontAwesomeIcon icon={faPlay} /></button>
                <button onClick={anesPause} className={styles.btn} title="Pause"><FontAwesomeIcon icon={faPause} /></button>
                <button onClick={anesReset} className={styles.btn} title="Reset"><FontAwesomeIcon icon={faXmark} /></button>
              </div>
              {!anesRun && anesLeft === anesStart && (
                <div className={styles.hint}>Set minutes, then press Play.</div>
              )}
            </Card>
          </div>
        </div>

        {/* RIGHT: Devices + Medical Gas */}
        <div className="col-span-12 lg:col-span-3 space-y-5 md:space-y-6">
          {/* Devices grid */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[clamp(14px,1.8vw,18px)] font-semibold text-slate-700">Devices</div>
              <div className="flex items-center gap-3">
                {devErr && <span className="text-sm text-rose-600">{devErr}</span>}
                <button
                  onClick={loadDevices}
                  className="border border-gray-300 rounded-full px-3 py-1.5 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                  title="Reload"
                >
                  <FontAwesomeIcon icon={faRotateRight} /> Reload
                </button>
                {devLoading && <span className="text-xs text-gray-400">Loading…</span>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dev.map(d => (
                <TapCard
                  key={d.id}
                  title={d.name || d.label}
                  sub={d.on ? "Tap to turn OFF" : "Tap to turn ON"}
                  pressed={d.on}
                  disabled={devSavingId === d.id}
                  loading={devSavingId === d.id}
                  onClick={toggleDevice(d.id)}
                />
              ))}
            </div>
          </Card>

          {/* MEDICAL GAS — COMPACT */}
          <Card>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[clamp(14px,1.8vw,18px)] font-semibold text-slate-700">Medical Gas</div>
              <div className="flex items-center gap-3">
                {gasErr && <span className="text-sm text-rose-600">{gasErr}</span>}
                <button onClick={loadGas} className="border border-gray-300 rounded-full px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2" title="Refresh">
                  <FontAwesomeIcon icon={faRotateRight} /> Refresh
                </button>
                {gasUpdatedAt && (
                  <span className="text-xs text-gray-400">Updated: {gasUpdatedAt.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {gas.map((g) => (<GasBadge key={g.code} code={g.code} status={g.status} />))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
