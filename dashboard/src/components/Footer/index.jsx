// src/layout/Footer/index.jsx
import React, { useEffect, useState, useCallback } from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { setActive } from "../../store/activeSlice";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { getAllGas, getAllPower } from "../../features/api/apiClient";

/* ===== blink CSS khi Fault ===== */
const AlarmCSS = () => (
  <style>{`
    @keyframes alarmInvert {
      0%,49% { background:#dc2626; color:#fff; border-color:#dc2626; }
      50%,100% { background:#fff; color:#111; border-color:#dc2626; }
    }
    .alarm-invert { animation: alarmInvert 1s linear infinite; }
  `}</style>
);

/* ===== Medical Gas (0=Normal, 1=Fault) ===== */
const GAS_ORDER = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];
const GAS_SAMPLE = GAS_ORDER.map((c) => ({ code: c, status: 0 }));
const toGasCode = (it) => String(it?.code ?? it?.keyword ?? "").toUpperCase();
const toStatus01 = (it) => (Number(it?.status) === 1 ? 1 : 0);
const shapeGas = (raw) => {
  const by = {};
  (raw || []).forEach((it) => {
    const code = toGasCode(it);
    if (GAS_ORDER.includes(code)) by[code] = { code, status: toStatus01(it) };
  });
  return GAS_ORDER.map((c) => by[c] ?? { code: c, status: 0 });
};

/* ===== Power (true=Fault, false=Normal) ===== */
const POWER_TILES = [
  { key: "ups",  title: "UPS"  },
  { key: "ips",  title: "IPS"  },
  { key: "main", title: "MAIN" },
];
const shapePower = (raw) => {
  const arr = Array.isArray(raw) ? raw : [];
  const byKey = Object.fromEntries(
    arr.map((it) => [String(it?.key || "").toLowerCase(), Boolean(it?.status)])
  );
  return POWER_TILES.map((t) => ({
    ...t,
    status: !!byKey[t.key], // true = Fault, false = Normal
  }));
};

/* ====== Chips chuyển trang trực tiếp ====== */
const GasChip = ({ code, status, onActivate }) => {
  const alarm = status === 1;
  return (
    <NavLink
      to="/medical-gas"
      onClick={onActivate}
      className={[
        "h-10 md:h-11 px-3 rounded-xl grid place-items-center",
        "text-sm md:text-base font-semibold border transition",
        alarm ? "alarm-invert" : "bg-emerald-600 text-white border-emerald-600",
      ].join(" ")}
      title={code}
      role="link"
      aria-label={`Medical Gas ${code}`}
    >
      {code}
    </NavLink>
  );
};

const PowerChip = ({ label, fault, onActivate }) => {
  const alarm = !!fault;
  return (
    <NavLink
      to="/power"
      onClick={onActivate}
      className={[
        "h-10 md:h-11 px-3 rounded-xl grid place-items-center",
        "text-sm md:text-base font-semibold border transition",
        alarm ? "alarm-invert" : "bg-emerald-600 text-white border-emerald-600",
      ].join(" ")}
      title={label}
      role="link"
      aria-label={`Power ${label}`}
    >
      {label}
    </NavLink>
  );
};

export default function Footer() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const pollIntervalSec = useSelector((s) => s?.settings?.pollIntervalSec ?? 10);

  /* ===== GAS state ===== */
  const [gas, setGas] = useState(GAS_SAMPLE);
  const loadGas = useCallback(async () => {
    try {
      const res = await getAllGas(); // GET /api/gas -> [{ code, status(0|1) }]
      const arr = Array.isArray(res?.data) ? res.data : [];
      setGas(shapeGas(arr));
    } catch (e) {
      dispatch(fetchDataFailure(e?.message ?? "getAllGas error"));
      setGas(GAS_SAMPLE);
    }
  }, [dispatch]);

  /* ===== POWER state ===== */
  const [power, setPower] = useState(shapePower([]));
  const loadPower = useCallback(async () => {
    try {
      const res = await getAllPower(); // GET /api/power -> [{ key, title, status:boolean }]
      setPower(shapePower(res?.data));
    } catch (e) {
      dispatch(fetchDataFailure(e?.message ?? "getAllPower error"));
      setPower(shapePower([]));
    }
  }, [dispatch]);

  /* ===== polling ===== */
  useEffect(() => {
    const runAll = () => { loadGas(); loadPower(); };
    runAll();
    const ms = Math.max(1, Number(pollIntervalSec || 10)) * 1000;
    const id = setInterval(runAll, ms);
    return () => clearInterval(id);
  }, [loadGas, loadPower, pollIntervalSec]);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-transparent backdrop-blur">
      <AlarmCSS />
      <div className="px-3 md:px-6 py-2 md:py-3">
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* spacer căn theo sidebar nếu có */}
          <div className="hidden md:block shrink-0" style={{ width: "var(--nav-w, 11rem)" }} />

          {/* MEDICAL GAS */}
          <div className="flex items-center gap-3 min-w-[260px]">
            <div className="text-lg md:text-2xl font-semibold text-slate-800 whitespace-nowrap">
              {t("Medical Gas")}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {gas.map((g) => (
                <GasChip
                  key={g.code}
                  code={g.code}
                  status={g.status}
                  onActivate={() => dispatch(setActive("medical-gas"))}
                />
              ))}
            </div>
          </div>

          {/* Divider chấm nhỏ */}
          <div className="h-5 w-px bg-slate-300/60 hidden md:block" />

          {/* POWER */}
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="text-lg md:text-2xl font-semibold text-slate-800 whitespace-nowrap">
              {t("Power")}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {power.map((p) => (
                <PowerChip
                  key={p.key}
                  label={p.title.toUpperCase()}
                  fault={p.status}
                  onActivate={() => dispatch(setActive("power"))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
