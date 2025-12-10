// src/layout/Footer/index.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { setActive } from "../../store/activeSlice";
import { selectGas, selectPower } from "../../features/status/statusSlice";

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

const GasChip = ({ code, fault, onActivate }) => {
  const alarm = !!fault;
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

  const gas = useSelector(selectGas);       // [{code,status,fault}]
  const power = useSelector(selectPower);   // [{key,fault}]

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-transparent backdrop-blur">
      <AlarmCSS />
      <div className="px-3 md:px-6 py-2 md:py-3">
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* spacer căn theo sidebar nếu có */}
          <div className="hidden md:block shrink-0" style={{ width: "var(--nav-w, 11rem)" }} />

          {/* MEDICAL GAS */}
          <div className="flex items-center gap-3 min-w=[260px]">
            <div className="text-lg md:text-2xl font-semibold text-slate-800 whitespace-nowrap">
              {t("Medical Gas")}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {gas.map((g) => (
                <GasChip
                  key={g.code}
                  code={g.code}
                  fault={g.fault}
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
                  label={(p.key || "").toUpperCase()}
                  fault={p.fault}
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
