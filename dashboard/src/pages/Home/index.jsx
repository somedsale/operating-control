// src/pages/Home/index.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setActive } from "../../store/activeSlice";
import logo from "../../assets/img/LogoMes.png";

export default function Home() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const timeFormat = useSelector((s) => s.settings?.timeFormat || "24h");

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // --- Helpers ---
  const pad2 = (n) => String(n).padStart(2, "0");
  const meridiem = (lang, hour) => {
    const isAM = hour < 12;
    return String(lang).toLowerCase().startsWith("vi")
      ? isAM ? "SA" : "CH"
      : isAM ? "AM" : "PM";
  };
  const toHM = (date, fmt = "24h", lang = "en") => {
    const H = date.getHours();
    const M = date.getMinutes();
    if (fmt === "12h") {
      const h12 = H % 12 || 12;
      return { hh: pad2(h12), mm: pad2(M), suffix: meridiem(lang, H) };
    }
    return { hh: pad2(H), mm: pad2(M), suffix: "" };
  };

  // --- Date/Time ---
  const ddmmyyyy = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
  const weekday = now.toLocaleDateString(i18n.language, { weekday: "long" });
  const { hh, mm, suffix } = toHM(now, timeFormat, i18n.language);

  const goControl = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
    } catch {} finally {
      dispatch(setActive("lighting"));
    }
  }, [dispatch]);

  const backToWindows = useCallback(async () => {
    try { await document.exitFullscreen?.(); } catch {}
    try {
      window.open("", "_self");
      window.close();
    } catch {}
    setTimeout(() => {
      if (!document.hidden) window.location.href = "about:blank";
    }, 150);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900">
      <style>{`.time-digits{font-variant-numeric:tabular-nums lining-nums}`}</style>

      {/* BACK TO WINDOWS */}
      <div className="absolute top-6 left-6">
        <button
          onClick={backToWindows}
          aria-label="Back to Windows"
          className="px-7 py-4 rounded-3xl border border-slate-300 
                     text-[13px] md:text-[14px] leading-[1.05] tracking-wide text-slate-600"
          title="Back to Windows"
        >
          BACK TO<br/>WINDOWS
        </button>
      </div>

      {/* Logo góc phải trên */}
      <img
        src={logo}
        alt="Logo"
        className="absolute top-6 right-6 h-10 md:h-12 object-contain"
      />

      {/* Nội dung trung tâm */}
      <div className="max-w-[1100px] mx-auto pt-16 md:pt-20 text-center">
        {/* Date line */}
        <div className="text-[clamp(18px,3vw,32px)] text-slate-500">
          {weekday} {ddmmyyyy}
        </div>

        {/* Time theo setting */}
        <div className="mt-6 time-digits flex items-baseline justify-center gap-4">
          <div className="text-[clamp(84px,18vw,224px)] font-semibold text-gray-400 leading-none">
            {hh}:{mm}
          </div>
          {timeFormat === "12h" && (
            <div className="text-[clamp(18px,3vw,32px)] text-gray-500">
              {suffix}
            </div>
          )}
        </div>

        {/* Đường cong mảnh dưới đồng hồ */}
        <div className="mx-auto mt-5 h-6 w-[min(92vw,600px)] rounded-full border-b-2 border-gray-300" />

        {/* GO TO CONTROL */}
        <div className="mt-8">
          <NavLink to="/lighting" onClick={goControl}>
            <div
              className="inline-flex items-center justify-center 
                         px-16 py-7 rounded-[32px] border-2 border-gray-300 
                         text-slate-700 text-[clamp(18px,2.8vw,28px)] tracking-wide"
            >
              {t("GO TO CONTROL") || "GO TO CONTROL"}
            </div>
          </NavLink>
        </div>

        {/* Version */}
        <div className="mt-7 text-[clamp(12px,2.2vw,22px)] text-gray-400">
          Version 1.34.0.1
        </div>
      </div>
    </div>
  );
}
