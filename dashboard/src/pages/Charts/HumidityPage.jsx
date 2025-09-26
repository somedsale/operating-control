// src/pages/Humidity/index.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import TemperatureChart from "../../components/Charts/TemperatureChart";
import { getHumidity } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";

const MAX_POINTS = 24 * 60; // 1440 điểm ~ mỗi phút trong ngày

/* ===== utils (cache theo ngày để không mất khi F5) ===== */
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

// sort tăng dần + dedupe theo giây
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

/* ===== page ===== */
export default function HumidityPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const apiBase = useSelector(
    (s) =>
      s.settings?.apiBaseUrl ||
      process.env.REACT_APP_API_BASE ||
      "http://localhost:5000"
  );

  const [current, setCurrent] = useState(0);
  const [series, setSeries] = useState([]); // [{timestamp, value}]
  const [loading, setLoading] = useState(true);

  const keyRef = useRef(ymdKey()); // cache key theo ngày

  // Đọc cache theo ngày
  const loadCache = useCallback(() => {
    try {
      const raw = localStorage.getItem(`hist.humd.${keyRef.current}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return normalize(parsed);
    } catch {
      return [];
    }
  }, []);

  // Lưu cache theo ngày
  const saveCache = useCallback((rows) => {
    try {
      localStorage.setItem(
        `hist.humd.${keyRef.current}`,
        JSON.stringify(normalize(rows))
      );
    } catch {}
  }, []);

  // Đổi ngày → key mới
  const rolloverDayIfNeeded = useCallback(() => {
    const nowKey = ymdKey();
    if (nowKey !== keyRef.current) {
      keyRef.current = nowKey;
      const restored = loadCache();
      setSeries(restored);
      if (restored.length) {
        setCurrent(restored[restored.length - 1].value);
      }
    }
  }, [loadCache]);

  // Thêm điểm mới + lưu cache
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

  // 1) Khôi phục cache khi mở trang
  useEffect(() => {
    const restored = loadCache();
    setSeries(restored);
    if (restored.length) setCurrent(restored[restored.length - 1].value);
  }, [loadCache]);

  // 2) Lịch sử hôm nay từ API
  const fetchHistoryToday = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${apiBase}/api/sensor/history?metric=humidity&bucketSec=60`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);

      const rawArr = Array.isArray(json) ? json : json?.humidity;
      const mapped = (rawArr || []).map((d) => ({
        timestamp: Date.parse(d.t),
        value: Number(d.v),
      }));

      setSeries((prev) => {
        const merged = mergeSeries(prev, mapped);
        saveCache(merged);
        if (merged.length) setCurrent(merged[merged.length - 1].value);
        return merged;
      });
    } catch (err) {
      dispatch(fetchDataFailure(err?.message ?? "get humidity history error"));
    } finally {
      setLoading(false);
    }
  }, [apiBase, dispatch, saveCache]);

  // 3) Giá trị hiện tại mỗi 10s
  const fetchCurrent = useCallback(async () => {
    try {
      rolloverDayIfNeeded();
      const res = await getHumidity();
      const v = Number(res.data);
      setCurrent(v);
      append(v);
    } catch (err) {
      dispatch(fetchDataFailure(err?.message ?? "getHumidity error"));
    }
  }, [append, dispatch, rolloverDayIfNeeded]);

  // Chu trình tải dữ liệu
  useEffect(() => {
    // Lần đầu: hợp nhất cache + lịch sử API, rồi poll hiện tại
    fetchHistoryToday().then(fetchCurrent);

    const id = setInterval(fetchCurrent, 10000);            // hiện tại 10s
    const idHist = setInterval(fetchHistoryToday, 5 * 60 * 1000); // lịch sử 5'
    const idDay = setInterval(rolloverDayIfNeeded, 30 * 1000);     // đổi ngày

    return () => {
      clearInterval(id);
      clearInterval(idHist);
      clearInterval(idDay);
    };
  }, [fetchHistoryToday, fetchCurrent, rolloverDayIfNeeded]);

  const currentStr = useMemo(
    () => (current?.toFixed ? current.toFixed(1) : current),
    [current]
  );

  return (
    <div className="w-full px-3 md:px-6">
      <div className="text-center">
        <Divider label={t("Humidity")} />
      </div>

      <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-4 md:p-6">
        <div className="flex items-baseline justify-between">
          <div className="text-slate-600">
            {t("Current")}: <span className="font-semibold">{currentStr} H%</span>
          </div>
          {loading && <div className="text-sm text-slate-400">{t("Loading")}…</div>}
        </div>

        <div className="mt-3">
          <TemperatureChart
            data={series}
            title={t("Humidity Chart H%")}
            unit="H%"
            min={0}
            max={80}
          />
        </div>
      </div>
    </div>
  );
}
