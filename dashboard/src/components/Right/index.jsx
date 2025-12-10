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
import { setLiveData } from "../../features/live/liveSlice";
import { apiJson } from "../../utils/api";

/* ---------- Tiny Sparkline ---------- */
const Spark = ({ data = [], width = 640, height = 56, strokeWidth = 3, ariaLabel }) => {
  const { pts } = useMemo(() => {
    if (!data.length) return { pts: "" };
    const values = data.map((d) => Number(d.v));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-6, max - min);
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const pts = data
      .map((d, i) => {
        const x = i * stepX;
        const y = height - ((Number(d.v) - min) / span) * height;
        return `${x},${y}`;
      })
      .join(" ");
    return { pts };
  }, [data, width, height]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel || "sparkline"}
      className="block"
      preserveAspectRatio="none"
    >
      <line x1="0" y1={height} x2={width} y2={height} stroke="#e5e7eb" strokeWidth="1" />
      <polyline
        fill="none"
        stroke="#334155"
        strokeWidth={strokeWidth}
        points={pts}
        vectorEffect="non-scaling-stroke"
      />
      {data.length > 0 && (
        <>
          <circle cx="2" cy={height - 2} r="3.5" fill="#0ea5e9" />
          <circle cx={width - 2} cy="2" r="3.5" fill="#0ea5e9" />
        </>
      )}
    </svg>
  );
};

/* ---------- Trend helper ---------- */
function useTrend(arr) {
  if (!Array.isArray(arr) || arr.length < 2) return { dir: 0, delta: 0 };
    const last = Number(arr[arr.length - 1]?.v);
    const prev = Number(arr[arr.length - 2]?.v);
    if (!Number.isFinite(last) || !Number.isFinite(prev)) return { dir: 0, delta: 0 };
    const delta = last - prev;
    return { dir: delta === 0 ? 0 : delta > 0 ? 1 : -1, delta };
}

/* ---------- BIG Stat Tile ---------- */
const Tile = ({ icon, title, value, unit, data, accent = "emerald", ariaTrend }) => {
  const { dir, delta } = useTrend(data);
  const ring =
    accent === "rose"
      ? "ring-rose-200/70"
      : accent === "sky"
      ? "ring-sky-200/70"
      : accent === "amber"
      ? "ring-amber-200/70"
      : "ring-emerald-200/70";

  const badge =
    dir > 0
      ? "text-emerald-800 bg-emerald-100 border-emerald-200"
      : dir < 0
      ? "text-rose-800 bg-rose-100 border-rose-200"
      : "text-slate-700 bg-slate-100 border-slate-200";

  const iconWrap =
    accent === "rose"
      ? "bg-rose-100 text-rose-700"
      : accent === "sky"
      ? "bg-sky-100 text-sky-700"
      : accent === "amber"
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <div className={`rounded-3xl bg-white/90 backdrop-blur shadow-sm px-5 py-5 ring-1 ${ring}`}>
      <div className="flex items-center justify-between gap-4 py-6">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-2xl grid place-items-center ${iconWrap}`}>
            <div className="text-2xl">{icon}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-[clamp(16px,2.2vw,20px)] text-slate-500 font-medium">{title}</div>
            <div className="flex items-baseline gap-3">
              <div className="text-[clamp(38px,4.8vw,56px)] font-semibold text-slate-900 leading-none">
                {value}
              </div>
              <div className="text-[clamp(16px,2vw,20px)] text-slate-500">{unit}</div>
            </div>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[clamp(13px,1.6vw,14px)] font-semibold ${badge}`}
          role="status"
          aria-label={ariaTrend}
          title={ariaTrend}
        >
          {dir > 0 && <FontAwesomeIcon icon={faChevronUp} />}
          {dir < 0 && <FontAwesomeIcon icon={faChevronDown} />}
          <span>{dir === 0 ? "—" : `${delta > 0 ? "+" : ""}${Number(delta).toFixed(1)}`}</span>
        </div>
      </div>
    </div>
  );
};

/* ---------- Component ---------- */
const Right = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const apiBase = useSelector((s) => s.settings?.apiBaseUrl || "");

  const [histTemp, setHistTemp] = useState([]);
  const [histHumd, setHistHumd] = useState([]);
  const [histPFilter, setHistPFilter] = useState([]);
  const [histPRoom, setHistPRoom] = useState([]);
  const [err, setErr] = useState("");

  const get = (path, opts) => apiJson(path, opts);

  /* === Lấy dữ liệu live từ PLC và cập nhật Redux === */
  const fetchLiveSensors = async () => {
    try {
      setErr("");
      // ✅ Gọi API mới /api/sensor/ai/live
      const json = await get("/api/sensor/ai/live");
      if (!json?.ok) throw new Error("PLC live data not ok");

      // ✅ API trả về channels.ch1,ch2,ch3,ch4
      const ch = json.channels || {};
      const tempVal = Number(ch?.ch1?.value ?? NaN);
      const humVal = Number(ch?.ch2?.value ?? NaN);
      const pfVal = Number(ch?.ch3?.value ?? NaN);
      const prVal = Number(ch?.ch4?.value ?? NaN);

      // ✅ Dispatch Redux
      dispatch(
        setLiveData({
          temp: tempVal,
          humidity: humVal,
          pressure_filter: pfVal,
          pressure_room: prVal,
        })
      );
    } catch (e) {
      const msg = e?.message || "fetchLiveSensors error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  /* === Lịch sử (Sparkline) === */
  const fetchHistory = async () => {
    try {
      setErr("");
      const temp = await get("/api/sensor/history?metric=temp&bucketSec=60");
      const hum = await get("/api/sensor/history?metric=humidity&bucketSec=60");
      const norm = (arr) =>
        Array.isArray(arr?.points)
          ? arr.points.map((d) => ({ t: d.t, v: Number(d.v) }))
          : [];
      setHistTemp(norm(temp));
      setHistHumd(norm(hum));
    } catch (e) {
      const msg = e?.message || "fetchHistory error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  const fetchPressureHistory = async () => {
    try {
      setErr("");
      const fRows = await get("/api/sensor/pressure/filter/history");
      const rRows = await get("/api/sensor/pressure/room/history");
      const norm = (arr) =>
        Array.isArray(arr) ? arr.map((d) => ({ t: d.t, v: Number(d.v) })) : [];
      setHistPFilter(norm(fRows));
      setHistPRoom(norm(rRows));
    } catch (e) {
      const msg = e?.message || "fetchPressureHistory error";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    }
  };

  /* === Polling === */
  useEffect(() => {
    fetchLiveSensors();
    // fetchHistory();
    // fetchPressureHistory();

    const tick = setInterval(fetchLiveSensors, 5000);
    // const histTick = setInterval(() => {
    //   fetchHistory();
    //   fetchPressureHistory();
    // }, 60000);

    return () => {
      clearInterval(tick);
      // clearInterval(histTick);
    };
  }, [apiBase]);

  /* === Hiển thị từ Redux === */
  const live = useSelector((s) => s.live || {});
  const tempDisplay = Number.isFinite(live.temp) ? live.temp.toFixed(1) : "--";
  const humDisplay = Number.isFinite(live.humidity)
    ? live.humidity.toFixed(1)
    : "--";
  const pfDisplay = Number.isFinite(live.pressure_filter)
    ? Number(live.pressure_filter).toFixed(0)
    : "--";
  const prDisplay = Number.isFinite(live.pressure_room)
    ? Number(live.pressure_room).toFixed(0)
    : "--";

  return (
    <aside className="hidden md:block w-full sticky top-4 self-start space-y-4">
      {!!err && (
        <div className="text-base text-rose-700 bg-rose-50/80 border border-rose-200 rounded-2xl px-4 py-3">
          {err}
        </div>
      )}

      <div className="space-y-4">
        <Tile
          icon={<FontAwesomeIcon icon={faTemperature0} />}
          title={t("Temperature")}
          value={tempDisplay}
          unit="°C"
          data={histTemp}
          accent="rose"
          ariaTrend={t("Temperature trend")}
        />
        <Tile
          icon={<FontAwesomeIcon icon={faDroplet} />}
          title={t("Humidity")}
          value={humDisplay}
          unit="%"
          data={histHumd}
          accent="sky"
          ariaTrend={t("Humidity trend")}
        />
        <Tile
          icon={<span className="text-lg font-semibold">ΔF</span>}
          title={t("Filter Pressure")}
          value={pfDisplay}
          unit="Pa"
          data={histPFilter}
          accent="amber"
          ariaTrend={t("Filter pressure trend")}
        />
        <Tile
          icon={<span className="text-lg font-semibold">ΔR</span>}
          title={t("Room Pressure")}
          value={prDisplay}
          unit="Pa"
          data={histPRoom}
          accent="emerald"
          ariaTrend={t("Room pressure trend")}
        />
      </div>
    </aside>
  );
};

export default Right;
