// src/pages/Pressure/index.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import PressureChart from "../../components/Charts/PressureChart";
import { fetchDataFailure } from "../../features/api/apiSlice";

const MAX_POINTS = 24 * 60; // 1440 điểm ~ mỗi phút trong ngày

/* ===== utils (cache theo ngày để không mất dữ liệu lúc F5) ===== */
const pad2 = (n) => String(n).padStart(2, "0");
const ymdKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isSameDayLocal = (ts, d = new Date()) => {
  const x = new Date(ts);
  return (
    x.getFullYear() === d.getFullYear() &&
    x.getMonth() === d.getMonth() &&
    x.getDate() === d.getDate()
  );
};

// sort tăng dần + dedupe theo giây (giữ điểm cuối cùng của mỗi giây)
const normalize = (arr) => {
  const rows = (Array.isArray(arr) ? arr : [])
    .map((p) => ({
      timestamp:
        typeof p.timestamp === "number"
          ? p.timestamp
          : p.timestamp instanceof Date
          ? p.timestamp.getTime()
          : typeof p.t === "number"
          ? p.t
          : Date.parse(p.t),
      value: Number(p.value ?? p.v),
    }))
    .filter((p) => Number.isFinite(p.timestamp) && Number.isFinite(p.value))
    .filter((p) => isSameDayLocal(p.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  const bySec = new Map();
  for (const r of rows) {
    const key = Math.floor(r.timestamp / 1000) * 1000;
    bySec.set(key, r.value);
  }
  return Array.from(bySec.entries())
    .map(([t, v]) => ({ timestamp: t, value: v }))
    .slice(-MAX_POINTS);
};

const mergeSeries = (a, b) => normalize([...(a || []), ...(b || [])]);

/* ===== Page: Room Pressure ===== */
export default function RoomPressurePage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const apiBase =
    useSelector((s) => s.settings?.apiBaseUrl) ||
    process.env.REACT_APP_API_BASE ||
    "http://localhost:5000";

  const liveRoom = useSelector((s) => s.live?.pressure_room); // 👈 Redux live data

  const [series, setSeries] = useState([]); // [{timestamp, value}]
  const [loading, setLoading] = useState(true);

  // Cache key theo ngày
  const keyRef = useRef(ymdKey());

  /* ----- Cache helpers ----- */
  const loadCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(`hist.press.room.${keyRef.current}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return normalize(parsed);
    } catch {
      return [];
    }
  }, []);

  const saveCache = useCallback((rows) => {
    try {
      localStorage.setItem(
        `hist.press.room.${keyRef.current}`,
        JSON.stringify(normalize(rows))
      );
    } catch {}
  }, []);

  // Đổi ngày → nạp cache mới
  const rolloverDayIfNeeded = useCallback(() => {
    const nowKey = ymdKey();
    if (nowKey !== keyRef.current) {
      keyRef.current = nowKey;
      const restored = loadCache();
      setSeries(restored);
    }
  }, [loadCache]);

  // Thêm 1 điểm mới và lưu cache
  const append = useCallback(
    (value, ts = Date.now()) => {
      rolloverDayIfNeeded();
      if (!Number.isFinite(value)) return;
      setSeries((prev) => {
        const next = mergeSeries(prev, [{ timestamp: ts, value: Number(value) }]);
        saveCache(next);
        return next;
      });
    },
    [rolloverDayIfNeeded, saveCache]
  );

  // 1️⃣ Khôi phục cache khi mở trang
  useEffect(() => {
    const restored = loadCache();
    setSeries(restored);
  }, [loadCache]);

  // 2️⃣ Lấy lịch sử hôm nay từ API
  const fetchHistoryToday = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${apiBase}/api/sensor/pressure/room/history?bucketSec=60`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);

      const rawArr =
        Array.isArray(json) ? json : json?.pressure || json?.room || json?.data;
      const mapped = (rawArr || []).map((d) => ({
        timestamp: Date.parse(d.t),
        value: Number(d.v),
      }));

      setSeries((prev) => {
        const merged = mergeSeries(prev, mapped);
        saveCache(merged);
        return merged;
      });
    } catch (err) {
      dispatch(fetchDataFailure(err?.message ?? "get room pressure history error"));
    } finally {
      setLoading(false);
    }
  }, [apiBase, dispatch, saveCache]);

  // 3️⃣ Khi Redux liveRoom thay đổi → thêm vào series
  useEffect(() => {
    if (Number.isFinite(liveRoom)) append(liveRoom);
  }, [liveRoom, append]);

  // 4️⃣ Chu trình tải lịch sử + rollover ngày
  useEffect(() => {
    fetchHistoryToday();
    const idHist = setInterval(fetchHistoryToday, 5 * 60 * 1000);
    const idDay = setInterval(rolloverDayIfNeeded, 30 * 1000);

    return () => {
      clearInterval(idHist);
      clearInterval(idDay);
    };
  }, [fetchHistoryToday, rolloverDayIfNeeded]);

  /* --- Hiển thị giá trị hiện tại --- */
  const currentStr = useMemo(() => {
    if (!Number.isFinite(liveRoom)) return "--";
    return liveRoom.toFixed(1);
  }, [liveRoom]);

  return (
    <div className="w-full px-3 md:px-6">
      <div className="text-center">
        <Divider label={t("Room Pressure")} />
      </div>

      <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-4 md:p-6">
        <div className="flex items-baseline justify-between">
          <div className="text-slate-600">
            {t("Current")}:{" "}
            <span className="font-semibold">{currentStr} Pa</span>
          </div>
          {loading && (
            <div className="text-sm text-slate-400">{t("Loading")}…</div>
          )}
        </div>

        <div className="mt-3">
          <PressureChart
            data={series}
            title={t("Room Pressure Chart (Pa)")}
            unit="Pa"
            min={-30}
            max={30}
          />
        </div>
      </div>
    </div>
  );
}
