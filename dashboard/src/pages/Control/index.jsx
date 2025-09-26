// src/pages/Control/index.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";

/** Map các item UI ↔ deviceId trên backend */
const CONTROL_ITEMS = [
  { id: 1, labelKey: "use", deviceId: "in_use" },
  { id: 2, labelKey: "operating lamp", deviceId: "operating_lamp" },
  { id: 3, labelKey: "x-ray", deviceId: "xray" },
  { id: 4, labelKey: "uv", deviceId: "uv" },
  { id: 5, labelKey: "heating lamp", deviceId: "heat_lamp" },
  { id: 6, labelKey: "Genaral Light", deviceId: "general_light" },
];

/* ===== API helper ===== */
const API_BASE = process.env.REACT_APP_API_BASE || "";
async function apiJson(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/* ---------- Card ấn nguyên element + overlay loading ---------- */
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
        pressed
          ? "bg-emerald-600 text-white shadow-md"
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

        {/* chip trạng thái ON/OFF */}
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

      {/* mô tả thêm (nếu cần children sau này) */}
    </button>

    {/* overlay saving */}
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

export default function Control() {
  const { t } = useTranslation();

  // Trạng thái 6 nút theo id UI
  const [states, setStates] = useState(
    CONTROL_ITEMS.reduce((acc, it) => ({ ...acc, [it.id]: false }), {})
  );
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [errorText, setErrorText] = useState("");

  // Load trạng thái từ backend khi mở trang
  const load = async () => {
    try {
      setLoading(true);
      setErrorText("");
      const list = await apiJson("/api/devices"); // [{deviceId,isOn,hwOn,...}]
      const byId = Object.fromEntries(list.map((d) => [d.deviceId, d]));
      const next = {};
      CONTROL_ITEMS.forEach((it) => {
        const d = byId[it.deviceId];
        const on =
          typeof d?.hwOn === "boolean"
            ? d.hwOn
            : typeof d?.isOn === "boolean"
            ? d.isOn
            : false;
        next[it.id] = on;
      });
      setStates(next);
    } catch (e) {
      console.error("[control] load error:", e);
      setErrorText(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) await load();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Toggle (ấn nguyên card)
  const handleTap = (id) => async () => {
    const item = CONTROL_ITEMS.find((x) => x.id === id);
    if (!item) return;

    const next = !states[id];

    // optimistic UI
    setStates((s) => ({ ...s, [id]: next }));
    setSavingId(id);
    setErrorText("");

    try {
      await apiJson(`/api/devices/${item.deviceId}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: next }),
      });
    } catch (e) {
      console.error("[control] set state error:", e);
      setErrorText(e.message || "Update failed");
      // rollback nếu lỗi
      setStates((s) => ({ ...s, [id]: !next }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="text-center">
        <Divider label={t("Controls")} />
      </div>

      {/* Header controls */}
      <div className="flex items-center justify-end gap-3 mb-4">
        {loading && (
          <span className="text-sm text-slate-500">{t("Loading")}...</span>
        )}
        {!!errorText && (
          <span className="text-sm text-rose-600">{errorText}</span>
        )}
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white"
        >
          {t("Reload")}
        </button>
      </div>

      {/* Lưới các card bấm toàn phần */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONTROL_ITEMS.map((item) => {
          const pressed = !!states[item.id];
          return (
            <TapCard
              key={item.id}
              title={t(item.labelKey)}
              sub={pressed ? t("Tap to turn OFF") : t("Tap to turn ON")}
              pressed={pressed}
              disabled={savingId === item.id}
              loading={savingId === item.id}
              onClick={handleTap(item.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
