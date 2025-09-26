import React, { useEffect, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { getAllGas } from "../../features/api/apiClient";

const styles = {
  card: "bg-white/70 backdrop-blur rounded-2xl shadow-sm p-4 md:p-5",
  label: "text-sm md:text-base text-slate-500",
  value: "text-[clamp(26px,3.4vw,38px)] font-semibold text-slate-800 leading-none",
  unit: "align-top text-[0.55em] ml-1",
  grid2: "grid grid-cols-2 gap-4",
};

// ===== chuẩn hoá giống Footer =====
const ORDER = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];
const SAMPLE = ORDER.map((c) => ({ code: c, status: 0 }));
const toCode = (it) => String(it?.code ?? it?.keyword ?? "").toUpperCase();
const toStatus01 = (it) => (Number(it?.status) === 1 ? 1 : 0);
const shapeGas = (raw) => {
  const by = {};
  (raw || []).forEach((it) => {
    const code = toCode(it);
    if (ORDER.includes(code)) by[code] = { code, status: toStatus01(it) };
  });
  return ORDER.map((c) => by[c] ?? { code: c, status: 0 });
};

export default function LeftQuickMetrics() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const apiBase = useSelector((s) => s.settings?.apiBaseUrl || "http://localhost:5000");
  const pollIntervalSec = useSelector((s) => s?.settings?.pollIntervalSec ?? 10);

  const [temp, setTemp] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [pFilter, setPFilter] = useState(null);
  const [pRoom, setPRoom] = useState(null);
  const [gas, setGas] = useState(SAMPLE);

  const loadTH = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/sensor/last`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);
      setTemp(Number(json?.temp ?? 0));
      setHumidity(Number(json?.humidity ?? 0));
    } catch (e) {
      dispatch(fetchDataFailure(e?.message || "loadTH error"));
    }
  }, [apiBase, dispatch]);

  const loadP = useCallback(async () => {
    try {
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
    } catch (e) {
      dispatch(fetchDataFailure(e?.message || "loadP error"));
    }
  }, [apiBase, dispatch]);

  const loadGas = useCallback(async () => {
    try {
      const res = await getAllGas(); // [{code,status}]
      const arr = Array.isArray(res?.data) ? res.data : [];
      setGas(shapeGas(arr));
    } catch (e) {
      dispatch(fetchDataFailure(e?.message ?? "getAllGas error"));
      setGas(SAMPLE);
    }
  }, [dispatch]);

  useEffect(() => {
    // lần đầu + interval
    loadTH(); loadP(); loadGas();
    const ms = Math.max(1, Number(pollIntervalSec || 10)) * 1000;
    const id = setInterval(() => { loadTH(); loadP(); loadGas(); }, ms);
    return () => clearInterval(id);
  }, [loadTH, loadP, loadGas, pollIntervalSec]);

  return (
    <aside className="w-full sticky top-4 self-start space-y-3">
      {/* TH */}
      <div className={styles.card}>
        <div className={styles.grid2}>
          <div className="flex flex-col items-center">
            <div className={styles.label}>{t("Temperature")}</div>
            <div className={styles.value}>
              {temp?.toFixed ? temp.toFixed(1) : temp}
              <span className={styles.unit}>°C</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className={styles.label}>{t("Humidity")}</div>
            <div className={styles.value}>
              {humidity?.toFixed ? humidity.toFixed(1) : humidity}
              <span className={styles.unit}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pressure */}
      <div className={styles.card}>
        <div className={styles.grid2}>
          <div className="flex flex-col items-center">
            <div className={styles.label}>{t("Filter Pressure")}</div>
            <div className={styles.value}>
              {pFilter == null ? "--" : Number(pFilter).toFixed(0)}
              <span className={styles.unit}>Pa</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className={styles.label}>{t("Room Pressure")}</div>
            <div className={styles.value}>
              {pRoom == null ? "--" : Number(pRoom).toFixed(0)}
              <span className={styles.unit}>Pa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Medical Gas mini grid */}
      <div className={styles.card}>
        <div className="text-slate-700 font-semibold mb-2">{t("Medical Gas")}</div>
        <div className="grid grid-cols-3 gap-2">
          {gas.map((g) => {
            const fault = g.status === 1;
            return (
              <div
                key={g.code}
                className={`h-10 rounded-xl grid place-items-center text-sm font-semibold border 
                  ${fault ? "bg-rose-50 text-rose-700 border-rose-300" : "bg-emerald-600 text-white border-emerald-600"}`}
                title={fault ? "Fault" : "Normal"}
              >
                {g.code}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
