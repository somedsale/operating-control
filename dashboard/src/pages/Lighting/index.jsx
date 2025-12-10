// src/pages/Lighting/index.jsx
import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import { apiJson, normalizeDevices } from "../../utils/api";

/* Card */
const Card = ({ children, disabled, onClick, pressed, title, sub, loading, loadingImg, t }) => (
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
        pressed ? "bg-emerald-600 text-white shadow-md" : "bg-white/80 text-slate-800 shadow-sm hover:shadow-md",
        "p-5 md:p-6"
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <h3 className="text-[clamp(16px,1.9vw,22px)] font-semibold tracking-wide">
            {title}
          </h3>
          {sub ? (
            <span className={pressed ? "text-emerald-100" : "text-slate-500"}>{sub}</span>
          ) : null}
        </div>
        <span
          className={[
            "inline-flex items-center justify-center rounded-xl px-3 h-9 text-sm font-semibold",
            pressed ? "bg-white/15 text-white border border-white/20" : "bg-emerald-600/10 text-emerald-700 border border-emerald-600/20"
          ].join(" ")}
          aria-live="polite"
        >
          {pressed ? t("ON") : t("OFF")}
        </span>
      </div>
      {children}
    </button>

    {loading && (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          {/* Ảnh loading local (fallback spinner nếu lỗi) */}
          <img
            src={loadingImg}
            alt={t("Saving…")}
            className="h-8 w-8"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          {/* Fallback spinner SVG */}
          <svg
            className="animate-spin h-6 w-6 text-emerald-600"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
          </svg>
          <span className="text-sm text-emerald-700 font-medium">{t("Saving…")}</span>
        </div>
      </div>
    )}
  </div>
);

/* Color helpers (disabled UI) */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = x => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export default function Lighting() {
  const { t } = useTranslation();

  // Ảnh loading local trong /public/assets
  const LOADING_IMG = `${process.env.PUBLIC_URL || ""}/assets/loading.png`;

  // KHÔNG lưu text đã dịch trong state — chỉ lưu key & tham số
  const [lights, setLights] = useState([
    { id: "light_1", nameKey: "Light n", n: 1, on: false, dim: 20 },
    { id: "light_2", nameKey: "Light n", n: 2, on: false, dim: 20 },
    { id: "light_3", nameKey: "Light n", n: 3, on: false, dim: 20 },
    { id: "light_4", nameKey: "Light n", n: 4, on: false, dim: 20 },
  ]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // Color (disabled)
  const [hue, setHue] = useState(0);
  const [hex, setHex] = useState(hslToHex(0, 100, 50));
  const gradientRef = useRef(null);
  useEffect(() => { setHex(hslToHex(hue, 100, 50)); }, [hue]);

  /* Load trạng thái device từ backend */
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const resp = await apiJson("/api/devices");
      const list = normalizeDevices(resp);
      const byId = Object.fromEntries(list.map(d => [d.deviceId, d]));
      setLights(prevLights =>
        prevLights.map(l => ({
          ...l,
          customName: byId[l.id]?.name || l.customName,
          on: byId[l.id]?.isOn ?? byId[l.id]?.hwOn ?? l.on,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  })();
  return () => { mounted = false; };
}, []);


  /* Toggle 1 đèn (ấn nguyên card) */
  const toggleLight = async (idx) => {
    const l = lights[idx];
    const targetOn = !l.on;
    setLights(arr => arr.map((it, i) => i === idx ? ({ ...it, on: targetOn }) : it));
    setSavingId(l.id);
    try {
      await apiJson(`/api/devices/${l.id}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: targetOn }),
      });
    } catch (e) {
      console.error("[lighting] set state error:", e.message);
      // rollback nếu lỗi
      setLights(arr => arr.map((it, i) => i === idx ? ({ ...it, on: !targetOn }) : it));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="text-center">
        <Divider label={t("Lighting")} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6">
          <div className="flex items-center justify-between mb-2">
            {loading ? (
              <span className="text-sm md:text-base text-slate-500">{t("Loading")}…</span>
            ) : <span />}
          </div>

          {/* Lights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {lights.map((l, i) => {
              // Ưu tiên: device.<id> → nameKey (Light n) → customName → fallback gốc
              const translated = t(`device.${l.id}`, {
                defaultValue: t(l.nameKey, {
                  n: l.n,
                  defaultValue: t(l.customName || "", {
                    defaultValue: l.customName || `Light ${l.n}`,
                  }),
                }),
              });
              return (
                <Card
                  key={l.id}
                  pressed={l.on}
                  disabled={savingId === l.id}
                  loading={savingId === l.id}
                  loadingImg={LOADING_IMG}
                  t={t}
title={(translated || "").toString().toUpperCase()}                  sub={l.on ? t("Tap to turn OFF") : t("Tap to turn ON")}
                  onClick={() => toggleLight(i)}
                >
                  <div className="mt-3 flex items-center gap-3 opacity-60 pointer-events-none select-none">
                    <span className={l.on ? "text-emerald-100" : "text-slate-500"}>{t("Dimmer")}</span>
                    <input type="range" min={0} max={100} value={l.dim} disabled readOnly className="w-full h-4" />
                    <span className={l.on ? "text-emerald-50" : "text-slate-700"}>{l.dim}%</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Light Color (disabled) */}
          {/* <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-6 opacity-60 pointer-events-none" aria-disabled="true"> */}
            {/* <div className="flex items-center justify-between mb-4">
              <h2 className="text-[clamp(20px,2.4vw,28px)] font-semibold text-slate-700">{t("Light Color")}</h2>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-9 h-9 rounded-md border" style={{ backgroundColor: hex }} title={hex} />
                  <span className="text-slate-700 font-mono text-base">{hex.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 text-base">{t("ON")}</span>
                  <span className="inline-block h-11 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            </div> */}

            {/* <div className="flex items-center gap-5">
              <div
                ref={gradientRef}
                className="relative grow h-5 rounded-full"
                style={{ background: "linear-gradient(90deg, red, #ff0, #0f0, #0ff, #00f, #f0f, red)" }}
                aria-label={t("Color gradient")}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={hue}
              >
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md"
                  style={{ left: `${(hue / 360) * 100}%`, backgroundColor: hex }}
                />
              </div>
              <input
                type="color"
                value={hex}
                disabled
                className="w-14 h-14 rounded-lg p-0 border"
                title={t("Pick color")}
                aria-label={t("Pick color")}
              />
            </div> */}
          {/* </div> */}
        </div>
      </div>
    </div>
  );
}
