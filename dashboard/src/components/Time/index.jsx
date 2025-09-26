// src/components/Time/index.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const pad2 = (n) => String(Math.floor(n)).padStart(2, "0");

// Style khớp với /timer
const styles = {
  date:    "text-[clamp(20px,3vw,36px)] text-gray-600",
  time:    "text-[clamp(72px,12.6vw,170px)] text-gray-600 leading-none font-light",
  colon:   "text-[clamp(30px,5.2vw,74px)] mx-[0.25em]",
  suffix:  "text-[clamp(18px,2.6vw,30px)] ml-2 text-gray-500",
};

// AM/PM theo ngôn ngữ (vi -> SA/CH, mặc định AM/PM)
const meridiem = (lang, hour) => {
  const isAM = hour < 12;
  if (String(lang).toLowerCase().startsWith("vi")) {
    return isAM ? "SA" : "CH";
  }
  return isAM ? "AM" : "PM";
};

const toClockParts = (date, fmt = "24h", lang = "en") => {
  const H = date.getHours();
  const M = date.getMinutes();
  const S = date.getSeconds();
  if (fmt === "12h") {
    const h12 = H % 12 || 12;
    return { hh: pad2(h12), mm: pad2(M), ss: pad2(S), suffix: meridiem(lang, H) };
  }
  return { hh: pad2(H), mm: pad2(M), ss: pad2(S), suffix: "" };
};

const Time = () => {
  const { t, i18n } = useTranslation();
  const timeFormat = useSelector((s) => s.settings?.timeFormat || "24h");

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Weekday + dd/MM/yyyy
  const rawWeekday = now.toLocaleDateString(i18n.language, { weekday: "long" });
  const weekday = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
  const dateStr = now.toLocaleDateString(i18n.language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // HH:MM:SS theo setting + suffix nếu 12h
  const { hh, mm, ss, suffix } = toClockParts(now, timeFormat, i18n.language);

  return (
    <div className="w-full flex justify-center">
      <div className="text-center">
        <div className={styles.date}>
          {weekday}, {dateStr}
        </div>

        <div className={`${styles.time} inline-flex items-center`} aria-live="polite">
          {hh}
          <span className={styles.colon}>:</span>
          {mm}
          {/* <span className={styles.colon}>:</span>
          {ss} */}
          {timeFormat === "12h" && <span className={styles.colon}>{suffix}</span>}
        </div>
      </div>
    </div>
  );
};

export default Time;
