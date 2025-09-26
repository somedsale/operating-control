// src/components/Right/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faTemperature0,
  faDroplet,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataFailure } from "../../features/api/apiSlice";

// style helpers
const chipBtn = "w-12 h-12 grid place-items-center border-2 rounded-xl hover:bg-gray-50";

/* ------- Tiny sparkline (SVG) ------- */
const Spark = ({ data = [], width = 160, height = 42, strokeWidth = 2, ariaLabel }) => {
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
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={ariaLabel || "sparkline"}
      className="block"
    >
      {/* baseline */}
      <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
      {/* path */}
      <polyline
        fill="none"
        stroke="#64748b"
        strokeWidth={strokeWidth}
        points={pts}
        vectorEffect="non-scaling-stroke"
      />
      {/* min/max dots */}
      {data.length > 0 && (
        <>
          <circle cx="2" cy={height - ((data[0].v - min) / Math.max(1e-6, max - min)) * height} r="2.5" fill="#334155" />
          <circle cx={width - 2} cy={height - ((data[data.length - 1].v - min) / Math.max(1e-6, max - min)) * height} r="2.5" fill="#334155" />
        </>
      )}
    </svg>
  );
};

const Right = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const apiBase = useSelector((s) => s.settings?.apiBaseUrl || "http://localhost:5000");

  const [temp, setTemp] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [histTemp, setHistTemp] = useState([]);       // [{t,v}]
  const [histHumd, setHistHumd] = useState([]);       // [{t,v}]

  // --- Pressure states ---
  const [pFilter, setPFilter] = useState(null);       // Pa
  const [pRoom, setPRoom] = useState(null);           // Pa
  const [histPFilter, setHistPFilter] = useState([]); // [{t,v}]
  const [histPRoom, setHistPRoom] = useState([]);     // [{t,v}]

  const [err, setErr] = useState("");

  // 1) Lấy giá trị hiện tại (gộp 1 request cho T/H)
  const fetchLast = async () => {
    try {
      setErr("");
      const res = await fetch(`${apiBase}/api/sensor/last`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setTemp(Number(json?.temp ?? 0));
      setHumidity(Number(json?.humidity ?? 0));
    } catch (error) {
      const msg = error?.message || "fetchLast error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  // 1b) Lấy áp suất hiện tại (2 endpoint)
  const fetchPressureLast = async () => {
    try {
      setErr("");
      const [fRes, rRes] = await Promise.all([
        fetch(`${apiBase}/api/sensor/pressure/filter`),
        fetch(`${apiBase}/api/sensor/pressure/room`),
      ]);
      const fJson = await fRes.json();
      const rJson = await rRes.json();
      if (!fRes.ok) throw new Error(fJson?.error || fRes.statusText);
      if (!rRes.ok) throw new Error(rJson?.error || rRes.statusText);
      setPFilter(Number(fJson?.value ?? fJson ?? 0));
      setPRoom(Number(rJson?.value ?? rJson ?? 0));
    } catch (error) {
      const msg = error?.message || "fetchPressureLast error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  // 2) Lịch sử trong ngày (gom theo phút) cho T/H
  const fetchHistory = async () => {
    try {
      setErr("");
      const res = await fetch(`${apiBase}/api/sensor/history?metric=all&bucketSec=60`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      const norm = (arr) =>
        Array.isArray(arr) ? arr.map((d) => ({ t: d.t, v: Number(d.v) })) : [];
      setHistTemp(norm(json?.temp));
      setHistHumd(norm(json?.humidity));
    } catch (error) {
      const msg = error?.message || "fetchHistory error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  // 2b) Lịch sử áp suất (gom theo phút)
  const fetchPressureHistory = async () => {
    try {
      setErr("");
      const [fRes, rRes] = await Promise.all([
        fetch(`${apiBase}/api/sensor/pressure/history?kind=filter&bucketSec=60`),
        fetch(`${apiBase}/api/sensor/pressure/history?kind=room&bucketSec=60`),
      ]);
      const fJson = await fRes.json();
      const rJson = await rRes.json();
      if (!fRes.ok) throw new Error(fJson?.error || fRes.statusText);
      if (!rRes.ok) throw new Error(rJson?.error || rRes.statusText);
      const norm = (arr) =>
        Array.isArray(arr) ? arr.map((d) => ({ t: d.t, v: Number(d.v) })) : [];
      setHistPFilter(norm(fJson?.points || fJson));
      setHistPRoom(norm(rJson?.points || rJson));
    } catch (error) {
      const msg = error?.message || "fetchPressureHistory error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  useEffect(() => {
    // lần đầu
    fetchLast();
    fetchHistory();
    fetchPressureLast();
    fetchPressureHistory();

    // giá trị hiện tại: 5s/lần (khớp simulator)
    const tick = setInterval(() => {
      fetchLast();
      fetchPressureLast();
    }, 5000);

    // lịch sử: 60s/lần
    const histTick = setInterval(() => {
      fetchHistory();
      fetchPressureHistory();
    }, 60000);

    return () => {
      clearInterval(tick);
      clearInterval(histTick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  return (
    <aside className="hidden md:flex md:flex-col w-full sticky top-4 self-start space-y-3">
      {/* Thẻ lỗi nhỏ nếu có */}
      {!!err && (
        <div className="text-sm text-rose-600 bg-rose-50/60 border border-rose-200 rounded-xl px-3 py-2">
          {err}
        </div>
      )}

      {/* Temperature & Humidity card */}
      <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {/* Temperature */}
          <div className="flex flex-col items-center">
            <h3 className="text-[clamp(18px,2.4vw,28px)] font-semibold text-slate-700 mb-2">
              {t("Temperature")}
            </h3>

            <div className="flex items-center gap-2 md:gap-3 my-2">
              <FontAwesomeIcon className="text-2xl md:text-3xl text-slate-700" icon={faTemperature0} />
              <div className="text-[clamp(28px,3.6vw,44px)] font-semibold text-slate-800 leading-none">
                {temp?.toFixed ? temp.toFixed(1) : temp}
                <span className="align-top text-[0.6em] ml-1">°C</span>
              </div>
            </div>

            {/* sparkline nhiệt độ (trong ngày, mỗi phút) */}
            <div className="w-full max-w-[220px] mt-1">
              <Spark data={histTemp} ariaLabel="Temperature trend" />
            </div>

            <div className="text-slate-500 mb-2 md:mb-3 mt-3">{t("Set")}</div>
            <div className="flex items-center gap-3">
              <button className={chipBtn} aria-label="Increase temperature setpoint">
                <FontAwesomeIcon icon={faChevronUp} />
              </button>
              <button className={chipBtn} aria-label="Decrease temperature setpoint">
                <FontAwesomeIcon icon={faChevronDown} />
              </button>
            </div>
          </div>

          {/* Humidity */}
          <div className="flex flex-col items-center">
            <h3 className="text-[clamp(18px,2.4vw,28px)] font-semibold text-slate-700 mb-2">
              {t("Humidity")}
            </h3>

            <div className="flex items-center gap-2 md:gap-3 my-2">
              <div className="text-[clamp(28px,3.6vw,44px)] font-semibold text-slate-800 leading-none">
                {humidity?.toFixed ? humidity.toFixed(1) : humidity}
                <span className="align-top text-[0.6em] ml-1">%</span>
              </div>
              <FontAwesomeIcon className="text-2xl md:text-3xl text-slate-700" icon={faDroplet} />
            </div>

            {/* sparkline độ ẩm (trong ngày, mỗi phút) */}
            <div className="w-full max-w-[220px] mt-1">
              <Spark data={histHumd} ariaLabel="Humidity trend" />
            </div>

            <div className="text-slate-500 mb-2 md:mb-3 mt-3">{t("Set")}</div>
            <div className="flex items-center gap-3">
              <button className={chipBtn} aria-label="Increase humidity setpoint">
                <FontAwesomeIcon icon={faChevronUp} />
              </button>
              <button className={chipBtn} aria-label="Decrease humidity setpoint">
                <FontAwesomeIcon icon={faChevronDown} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Pressure card */}
      <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-4 md:p-6">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {/* Filter pressure */}
          <div className="flex flex-col items-center">
            <h3 className="text-[clamp(18px,2.4vw,28px)] font-semibold text-slate-700 mb-2">
              {t("Filter Pressure")}
            </h3>
            <div className="flex items-center gap-2 md:gap-3 my-2">
              <div className="text-[clamp(28px,3.6vw,44px)] font-semibold text-slate-800 leading-none">
                {pFilter == null ? "--" : Number(pFilter).toFixed(0)}
                <span className="align-top text-[0.6em] ml-1">Pa</span>
              </div>
            </div>
            <div className="w-full max-w-[220px] mt-1">
              <Spark data={histPFilter} ariaLabel="Filter pressure trend" />
            </div>
          </div>

          {/* Room pressure */}
          <div className="flex flex-col items-center">
            <h3 className="text-[clamp(18px,2.4vw,28px)] font-semibold text-slate-700 mb-2">
              {t("Room Pressure")}
            </h3>
            <div className="flex items-center gap-2 md:gap-3 my-2">
              <div className="text-[clamp(28px,3.6vw,44px)] font-semibold text-slate-800 leading-none">
                {pRoom == null ? "--" : Number(pRoom).toFixed(0)}
                <span className="align-top text-[0.6em] ml-1">Pa</span>
              </div>
            </div>
            <div className="w-full max-w-[220px] mt-1">
              <Spark data={histPRoom} ariaLabel="Room pressure trend" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Right;
