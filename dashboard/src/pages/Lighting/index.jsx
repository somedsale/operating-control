// src/pages/Lighting/index.jsx
import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";

/* ---------- Card ấn nguyên element + overlay loading ---------- */
const Card = ({ children, disabled, onClick, pressed, title, sub, loading }) => (
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
        pressed
          ? "bg-emerald-600 text-white shadow-md"
          : "bg-white/80 text-slate-800 shadow-sm hover:shadow-md",
        "p-5 md:p-6"
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h3 className="text-[clamp(16px,1.9vw,22px)] font-semibold tracking-wide">
            {title}
          </h3>
          {sub ? (
            <span className={pressed ? "text-emerald-100" : "text-slate-500"}>
              {sub}
            </span>
          ) : null}
        </div>
        {/* chip trạng thái */}
        <span
          className={[
            "inline-flex items-center justify-center rounded-xl px-3 h-9 text-sm font-semibold",
            pressed
              ? "bg-white/15 text-white border border-white/20"
              : "bg-emerald-600/10 text-emerald-700 border border-emerald-600/20"
          ].join(" ")}
        >
          {pressed ? "ON" : "OFF"}
        </span>
      </div>
      {children}
    </button>

    {/* overlay khi saving */}
    {loading && (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          <svg
            className="animate-spin h-6 w-6 text-emerald-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            ></path>
          </svg>
          <span className="text-sm text-emerald-700 font-medium">Saving…</span>
        </div>
      </div>
    )}
  </div>
);

/* ===== Helpers: HSL <-> HEX ===== */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function hexToHue(hex) {
  let r = 0, g = 0, b = 0;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (m) {
    r = parseInt(m[1], 16) / 255;
    g = parseInt(m[2], 16) / 255;
    b = parseInt(m[3], 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h;
  if (max === min) h = 0;
  else if (max === r) h = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) h = 60 * ((b - r) / (max - min)) + 120;
  else h = 60 * ((r - g) / (max - min)) + 240;
  return h;
}

/* ---------- API helpers ---------- */
const API_BASE = process.env.REACT_APP_API_BASE || ""; // để trống dùng proxy /api
async function apiJson(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export default function Lighting() {
  const { t } = useTranslation();

  // Lights: đồng bộ với backend
  const [lights, setLights] = useState([
    { id: "light_1", name: "Light 1", on: false, dim: 20 },
    { id: "light_2", name: "Light 2", on: false, dim: 20 },
    { id: "light_3", name: "Light 3", on: false, dim: 20 },
    { id: "light_4", name: "Light 4", on: false, dim: 20 },
  ]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // Color picker state (disable)
  const [colorOn] = useState(false);
  const [hue, setHue] = useState(0);
  const [hex, setHex] = useState(hslToHex(0, 100, 50));
  const gradientRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  /* ----- Load trạng thái từ BE ----- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const all = await apiJson("/api/devices"); // [{deviceId, name, relay, isOn, hwOn}]
        const byId = Object.fromEntries(all.map(d => [d.deviceId, d]));
        const next = lights.map(l => {
          const d = byId[l.id];
          const on = typeof d?.hwOn === "boolean" ? d.hwOn
                   : typeof d?.isOn === "boolean" ? d.isOn
                   : false;
          return { ...l, name: d?.name || l.name, on };
        });
        if (mounted) setLights(next);
      } catch (e) {
        console.error("[lighting] load error:", e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- Toggle 1 đèn (ấn nguyên card) ----- */
  const toggleLight = async (idx) => {
    const l = lights[idx];
    const targetOn = !l.on;
    // optimistic UI
    setLights(arr => arr.map((it, i) => i === idx ? { ...it, on: targetOn } : it));
    setSavingId(l.id);
    try {
      await apiJson(`/api/devices/${l.id}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: targetOn }),
      });
    } catch (e) {
      console.error("[lighting] set state error:", e.message);
      // rollback nếu lỗi
      setLights(arr => arr.map((it, i) => i === idx ? { ...it, on: !targetOn } : it));
    } finally {
      setSavingId(null);
    }
  };

  const setLight = (i, patch) =>
    setLights((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  /* ----- Color picker (bị disable) ----- */
  useEffect(() => { setHex(hslToHex(hue, 100, 50)); }, [hue]);
  const handleColorInput = () => {};
  const onMouseDown = () => {};
  const onMouseMove = () => {};
  const onMouseUp = () => setDragging(false);
  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);
  const thumbLeft = `${(hue / 360) * 100}%`;

  return (
    <div className="w-full px-4 py-4">
      <div className="text-center">
        <Divider label={t("Lighting")} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6">
          {/* header nhỏ */}
          <div className="flex items-center justify-between mb-2">
            {loading ? (
              <span className="text-sm md:text-base text-slate-500">{t("Loading")}...</span>
            ) : <span />}
          </div>

          {/* Lights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {lights.map((l, i) => (
              <Card
                key={l.id}
                pressed={l.on}
                disabled={savingId === l.id}
                loading={savingId === l.id}
                title={l.name.toUpperCase()}
                sub={l.on ? t("Tap to turn OFF") : t("Tap to turn ON")}
                onClick={() => toggleLight(i)}
              >
                {/* Dimmer (đã disable) */}
                <div className="mt-3 flex items-center gap-3 opacity-60 pointer-events-none select-none">
                  <span className={l.on ? "text-emerald-100" : "text-slate-500"}>{t("Dimmer")}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={l.dim}
                    disabled
                    readOnly
                    className="w-full h-4"
                    onChange={() => {}}
                  />
                  <span className={l.on ? "text-emerald-50" : "text-slate-700"}>{l.dim}%</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Light Color (đã disable toàn bộ) */}
          <div
            className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-6 opacity-60 pointer-events-none"
            aria-disabled="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[clamp(20px,2.4vw,28px)] font-semibold text-slate-700">
                {t("Light Color")}
              </h2>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-9 h-9 rounded-md border"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                  <span className="text-slate-700 font-mono text-base">{hex.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 text-base">{t("ON")}</span>
                  <span className="inline-block h-11 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div
                ref={gradientRef}
                className="relative grow h-5 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, red, #ff0, #0f0, #0ff, #00f, #f0f, red)",
                }}
                aria-label="Color gradient"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={hue}
              >
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md"
                  style={{ left: thumbLeft, backgroundColor: hex }}
                />
              </div>
              <input
                type="color"
                value={hex}
                onChange={handleColorInput}
                disabled
                className="w-14 h-14 rounded-lg p-0 border"
                title="Pick color"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
