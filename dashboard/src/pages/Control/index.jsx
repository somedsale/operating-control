// src/pages/Control/index.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import { apiJson, normalizeDevices } from "../../utils/api";

/* ---------- Card (giống Lighting) ---------- */
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
        pressed
          ? "bg-emerald-600 text-white shadow-md"
          : "bg-white/80 text-slate-800 shadow-sm hover:shadow-md",
        "p-5 md:p-6",
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

        {/* chip trạng thái ON/OFF */}
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

    {/* overlay saving */}
    {loading && (
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2">
          {/* Ảnh loading local (ẩn nếu lỗi) */}
          <img
            src={loadingImg}
            alt={t("Saving…")}
            className="h-8 w-8"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
          {/* Fallback spinner SVG */}
          <svg
            className="animate-spin h-6 w-6 text-emerald-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <span className="text-sm text-emerald-700 font-medium">{t("Saving…")}</span>
        </div>
      </div>
    )}
  </div>
);

export default function Control() {
  const { t } = useTranslation();

  // Ảnh loading local giống Lighting
  const LOADING_IMG = `${process.env.PUBLIC_URL || ""}/assets/loading.png`;

  /** Không lưu text dịch — chỉ giữ key & params; id = deviceId để PATCH thẳng */
  const [items, setItems] = useState([
    { id: "in_use",         nameKey: "use",              on: false },
    { id: "operating_lamp", nameKey: "operating lamp",   on: false },
    { id: "xray",           nameKey: "x-ray",            on: false },
    { id: "uv",             nameKey: "UV Lamp",          on: false },
    { id: "heat_lamp",      nameKey: "heating lamp",     on: false },
    { id: "general_light",  nameKey: "General Light",    on: false }, // đảm bảo có key i18n "General Light"
  ]);

  const [loading, setLoading]   = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [errorText, setErrorText] = useState("");

  /* Load trạng thái từ backend (giống Lighting) */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErrorText("");
        const resp = await apiJson("/api/devices");
        const list = normalizeDevices(resp);

        // map theo deviceId (giữ nguyên, vì normalizeDevices có thể trả nhiều field)
        const byId = Object.fromEntries(list.map(d => [d.deviceId, d]));

        if (!mounted) return;
        setItems(prev =>
          prev.map(it => ({
            ...it,
            // nếu backend có name → gán vào customName để overwrite title
            customName: byId[it.id]?.name || it.customName,
            // chấp nhận nhiều field bool: isOn/hwOn/on
            on: (byId[it.id]?.isOn ?? byId[it.id]?.hwOn ?? byId[it.id]?.on ?? it.on) ? true : false,
          }))
        );
      } catch (e) {
        console.error("[control] load error:", e);
        if (mounted) setErrorText(e.message || t("Load failed"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Toggle một thiết bị (ấn nguyên card) — giống Lighting */
  const handleTap = (idx) => async () => {
    const it = items[idx];
    const next = !it.on;

    // optimistic UI
    setItems(arr => arr.map((x, i) => (i === idx ? { ...x, on: next } : x)));
    setSavingId(it.id);
    setErrorText("");

    try {
      await apiJson(`/api/devices/${it.id}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: next }),
      });
      // (tuỳ chọn) có thể đọc resp & đồng bộ lại nếu server trả xác nhận
      // const conf = normalizeDevices(resp); ...
    } catch (e) {
      console.error("[control] set state error:", e);
      setErrorText(e.message || t("Update failed"));
      // rollback nếu lỗi
      setItems(arr => arr.map((x, i) => (i === idx ? { ...x, on: !next } : x)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full px-4 py-4">
      <div className="text-center">
        <Divider label={t("controls")} />
      </div>

      {/* Header controls */}
      <div className="flex items-center justify-start gap-3 mb-4">
        {loading && <span className="text-sm text-slate-500">{t("Loading")}…</span>}
        {!!errorText && <span className="text-sm text-rose-600">{errorText}</span>}
      </div>

      {/* Lưới các card bấm toàn phần */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it, idx) => {
          const pressed = !!it.on;
        const title =
          t(`device.${it.id}`, {
            defaultValue:
              t(it.nameKey, {
                defaultValue: t(it.customName || "", {
                  defaultValue: it.customName || it.nameKey || it.id,
                }),
              }),
          });

          return (
            <TapCard
              key={it.id}
              title={title}
              sub={pressed ? t("Tap to turn OFF") : t("Tap to turn ON")}
              pressed={pressed}
              disabled={savingId === it.id}
              loading={savingId === it.id}
              loadingImg={LOADING_IMG}
              t={t}
              onClick={handleTap(idx)}
            />
          );
        })}
      </div>
    </div>
  );
}
