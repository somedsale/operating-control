import { faHandPointer } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const pad2 = (n) => String(n).padStart(2, "0");

export default function StandBy() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const weekday = now.toLocaleDateString(i18n.language, { weekday: "long" });
  const dateStr = now.toLocaleDateString(i18n.language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  const goHome = useCallback(() => navigate("/lighting"), [navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        goHome();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goHome]);

  return (
    <div
      className="relative min-h-screen w-full 
                 bg-gradient-to-b from-sky-50 to-white
                 text-slate-800 select-none cursor-pointer"
      onClick={goHome}
      role="button"
      tabIndex={0}
      aria-label={t("Tap to return to back home")}
    >
      <style>{`.time-digits{font-variant-numeric:tabular-nums lining-nums}`}</style>

      {/* ngày ở trên */}
      <div className="absolute top-6 inset-x-0 text-center">
        <p className="text-[clamp(16px,3vw,28px)] text-slate-600">
          {weekday} {dateStr}
        </p>
      </div>

      {/* nội dung trung tâm */}
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="time-digits text-[clamp(84px,18vw,220px)] font-semibold text-slate-500 leading-none">
          {timeStr}
        </div>

        <div
          className="mt-8 inline-flex items-center gap-3 px-8 py-4 rounded-2xl
                     border border-slate-300 bg-white/70 hover:bg-white
                     text-slate-700 text-[clamp(14px,2.6vw,22px)] transition"
        >
          {t("Tap to return to back home")}
          <FontAwesomeIcon icon={faHandPointer} />
        </div>
      </div>
    </div>
  );
}
