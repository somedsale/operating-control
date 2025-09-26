// src/pages/Ventilation/index.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import { useDispatch, useSelector } from "react-redux";
import {
  getVentilation,
  getFilterPressure,
  getRoomPressure,
} from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";
import LaminarSketch from "./laminar";

/* ---------------- Pill buttons ---------------- */
const Pill = ({ label, state = "neutral", onClick }) => {
  // neutral | active | ok | fault
  const base =
    "min-w-[150px] px-6 py-2 rounded-full border text-center text-[clamp(14px,1.4vw,18px)] select-none";

  const map = {
    neutral: "bg-white/80 border-slate-300 text-slate-600",
    active: "bg-slate-200 border-slate-300 text-slate-700",
    ok: "bg-emerald-500 text-white border-emerald-500",
    // fault nhấp nháy đảo màu
    fault: "pill-fault",
  };

  return (
    <>
      <style>{`
        @keyframes alarmInvert {
          0%,49%   { background:#dc2626; color:#ffffff; border-color:#dc2626; }
          50%,100% { background:#ffffff; color:#111111; border-color:#dc2626; }
        }
        .pill-fault {
          animation: alarmInvert 1s linear infinite;
          border-width: 1px;
          border-style: solid;
          border-color: #dc2626;
        }
      `}</style>
      <button className={`${base} ${map[state]}`} onClick={onClick}>
        {label}
      </button>
    </>
  );
};

const PillToggle = ({ on = false, onChange }) => (
  <Pill
    label={on ? "On" : "Off"}
    state={on ? "active" : "neutral"}
    onClick={() => onChange?.(!on)}
  />
);

/* ---------------- Small pressure box ---------------- */
const PressureBox = ({ label, value, unit = "Pa" }) => {
  const shown =
    value === null || value === undefined || Number.isNaN(value)
      ? "--"
      : Number(value).toFixed(0);
  return (
    <div className="flex-1 min-w-[180px] bg-white/80 border border-slate-200 rounded-2xl px-4 py-3">
      <div className="text-[clamp(14px,1.4vw,18px)] text-slate-500">{label}</div>
      <div className="mt-1 text-[clamp(28px,3vw,40px)] font-semibold text-slate-800">
        {shown}
        <span className="ml-2 text-slate-400 text-[0.6em] align-top">{unit}</span>
      </div>
    </div>
  );
};

/* ---------------- Page ---------------- */
const Ventilation = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const pollSec = useSelector((s) => s?.settings?.pollIntervalSec ?? 10);

  const [isOn, setIsOn] = useState(false);
  const [setback, setSetback] = useState("Normal"); // Normal / Eco / Off
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Áp suất lấy từ API riêng
  const [pressure, setPressure] = useState({ filter: null, room: null });

  // Map alarm từ API (fallback an toàn)
  const ui = {
    plantFailed: !!data?.plantFailed,
    dirtyHepa: !!(data?.alarmLaminar ?? data?.dirtyHepa),
    lowAirflow: !!data?.lowAirflow,
    ambient: !!(data?.ambientAlarm ?? data?.ambient),
    hepaFilter: !!(data?.hepaFilterAlarm ?? data?.hepaFilter),
  };

  const fetchVent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVentilation();
      setData(res?.data ?? null);
    } catch (error) {
      dispatch(fetchDataFailure(error?.message ?? "getVentilation error"));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const fetchPressure = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        getFilterPressure(), // GET /api/sensor/pressure/filter
        getRoomPressure(),   // GET /api/sensor/pressure/room
      ]);
      setPressure({
        filter: Number(f?.data ?? 0),
        room: Number(r?.data ?? 0),
      });
    } catch (error) {
      dispatch(fetchDataFailure(error?.message ?? "getPressure error"));
    }
  }, [dispatch]);

  useEffect(() => {
    // initial
    fetchVent();
    fetchPressure();

    // polling
    const id = setInterval(() => {
      fetchVent();
      fetchPressure();
    }, Math.max(3, Number(pollSec)) * 1000);

    return () => clearInterval(id);
  }, [fetchVent, fetchPressure, pollSec]);

  return (
    <div className="w-full px-3 md:px-6">
      <div className="w-full text-center capitalize">
        <Divider label={t("ventilation")} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT: Ventilation / Setback */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="flex flex-col items-start gap-8 md:gap-12 pt-2">
            <div>
              <div className="text-[clamp(18px,2.4vw,28px)] text-slate-500 mb-3">
                {t("Ventilation")}
              </div>
              <PillToggle on={isOn} onChange={setIsOn} />
            </div>

            <div>
              <div className="text-[clamp(18px,2.4vw,28px)] text-slate-500 mb-3">
                {t("Setback")}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Pill
                  label={t("Normal")}
                  state={setback === "Normal" ? "active" : "neutral"}
                  onClick={() => setSetback("Normal")}
                />
                {/* <Pill label="Eco" state={setback==='Eco'?'active':'neutral'} onClick={()=>setSetback('Eco')} /> */}
              </div>
            </div>

            {/* trạng thái tải + nút reload */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {loading ? <span>{t("Loading")}...</span> : null}
              <button
                onClick={() => { fetchVent(); fetchPressure(); }}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
              >
                {t("Refresh")}
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE: Laminar + Pressure */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6 space-y-4">
          <div className="w-full rounded-2xl bg-white/70 backdrop-blur p-4 md:p-6">
            <LaminarSketch isOn={isOn} />
          </div>

          {/* Áp suất lọc / Áp suất phòng từ API riêng */}
          <div className="w-full rounded-2xl bg-white/70 backdrop-blur p-4 md:p-6">
            <div className="text-[clamp(18px,2.4vw,28px)] text-slate-600 mb-3">
              {t("Pressure")}
            </div>
            <div className="flex flex-wrap gap-4">
              <PressureBox label={t("Filter Pressure")} value={pressure.filter} />
              <PressureBox label={t("Room Pressure")} value={pressure.room} />
            </div>
          </div>
        </div>

        {/* RIGHT: Alarms */}
        <div className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="flex flex-col items-end md:items-start gap-10 pt-2">
            <div className="w-full">
              <div className="text-[clamp(18px,2.4vw,28px)] text-slate-500 mb-3 leading-tight text-right md:text-left">
                {t("Laminar Flow")} <br /> {t("Alarm")}
              </div>
              <div className="flex flex-col gap-3 items-end md:items-start">
                <Pill
                  label={t("Plant Failed")}
                  state={ui.plantFailed ? "fault" : "neutral"}
                />
                <Pill
                  label={t("Dirty HEPA Filter")}
                  state={ui.dirtyHepa ? "fault" : "neutral"}
                />
                <Pill
                  label={t("Low Airflow")}
                  state={ui.lowAirflow ? "fault" : "neutral"}
                />
              </div>
            </div>

            <div className="w-full">
              <div className="text-[clamp(18px,2.4vw,28px)] text-slate-500 mb-3 leading-tight text-right md:text-left">
                {t("Differential")} <br /> {t("Pressure Alarm")}
              </div>
              <div className="flex flex-col gap-3 items-end md:items-start">
                <Pill
                  label={t("Ambient")}
                  state={ui.ambient ? "fault" : "neutral"}
                />
                <Pill
                  label={t("HEPA Filter")}
                  state={ui.hepaFilter ? "fault" : "neutral"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ventilation;
