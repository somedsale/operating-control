// src/layout/NavBar/index.jsx (hoặc đường dẫn file bạn gửi)
import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setActive } from "../../store/activeSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faRectangleList,
  faPlug,
  faGaugeSimpleHigh,
  faStopwatch,
  faThermometerHalf,
  faDroplet,
  faChartBar,
  faChartLine,
  faFilter, // 👈 NEW
} from "@fortawesome/free-solid-svg-icons";

/* ====== NAV DATA (cột chính) ====== */
const items = [
  { id: "lighting",     to: "/lighting",     icon: faLightbulb,       label: "Lighting",    accent: "emerald" },
  { id: "control",      to: "/control",      icon: faRectangleList,   label: "Controls",    accent: "blue"    },
  { id: "power",        to: "/power",        icon: faPlug,            label: "Power",       accent: "amber"   },
  { id: "medical-gas",  to: "/medical-gas",  icon: faGaugeSimpleHigh, label: "Gas",         accent: "rose"    },
  { id: "timer",        to: "/timer",        icon: faStopwatch,       label: "Timer",       accent: "violet"  },
];

/* ====== Quick chips (đi thẳng view đồ thị) ======
   - Giữ 2 chip có sẵn: nhiệt độ & độ ẩm
   - Thêm 2 chip mới: áp suất phòng & áp suất lọc
*/
const chipTargets = [
  { id: "temperature",   to: "/temperature",      iconL: faThermometerHalf, iconR: faChartBar,  label: "GRAPH" },
  { id: "humidity",      to: "/humidity",         iconL: faDroplet,         iconR: faChartLine, label: "GRAPH" },
  { id: "pressure-room", to: "/pressure/room",    iconL: faGaugeSimpleHigh, iconR: faChartLine, label: "GRAPH" }, // 👈 NEW
  { id: "pressure-filter", to: "/pressure/filter", iconL: faFilter,          iconR: faChartLine, label: "GRAPH" }, // 👈 NEW
];

/* ====== STYLES ====== */
const baseBtn =
  "group relative flex items-center gap-4 w-full rounded-2xl px-4 py-3 border transition shadow-sm bg-white/80 backdrop-blur";
const inactive =
  "border-slate-300 text-slate-600 hover:bg-white hover:-translate-y-[1px]";
const active =
  "border-transparent text-blue-800 bg-gradient-to-r from-blue-50 to-white ring-2 ring-blue-200 shadow";

const iconWrap = (isActive, accent) =>
  [
    "w-12 h-12 grid place-items-center rounded-xl border-2 transition-colors shrink-0",
    isActive
      ? "bg-white border-white/80"
      : "bg-white/80 border-slate-300 text-slate-500",
    isActive && accent === "emerald" && "text-emerald-600",
    isActive && accent === "blue" && "text-blue-600",
    isActive && accent === "amber" && "text-amber-600",
    isActive && accent === "rose" && "text-rose-600",
    isActive && accent === "violet" && "text-violet-600",
  ]
    .filter(Boolean)
    .join(" ");

const labelCls =
  "text-[clamp(15px,1.9vw,18px)] font-semibold tracking-wide capitalize";

const chipBase =
  "flex items-center gap-2 rounded-xl px-3 py-2 border text-[12px] font-semibold transition bg-white/80 backdrop-blur";
const chipInactive = "border-slate-300 text-slate-600 hover:bg-white";
const chipActive = "border-blue-300 text-blue-700 bg-blue-50 ring-1 ring-blue-200";

/* ====== COMPONENT ====== */
export default function NavBar() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { value } = useSelector((s) => s.active);

  return (
    <aside className="hidden md:flex md:flex-col w-full sticky top-4 self-start space-y-3">
      {items.map((it) => (
        <NavLink
          key={it.id}
          to={it.to}
          onClick={() => dispatch(setActive(it.id))}
          className={({ isActive }) =>
            [
              baseBtn,
              (isActive || value === it.id) ? active : inactive,
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
            ].join(" ")
          }
          aria-label={t(it.label)}
        >
          {({ isActive }) => (
            <>
              {(isActive || value === it.id) && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-full w-[6px] rounded-l-2xl bg-gradient-to-b from-blue-400 to-blue-600"
                />
              )}

              <div className={iconWrap(isActive || value === it.id, it.accent)}>
                <FontAwesomeIcon className="text-xl" icon={it.icon} />
              </div>

              <div className="flex flex-col">
                <span className={labelCls}>{t(it.label)}</span>
                <span className="text-[11px] text-slate-400 leading-tight">
                  {it.id === "medical-gas" ? t("Medical Gas") : " "}
                </span>
              </div>
            </>
          )}
        </NavLink>
      ))}

      {/* Quick chips (GRAPH) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {chipTargets.map((ch) => (
          <NavLink
            key={ch.id}
            to={ch.to}
            onClick={() => dispatch(setActive(ch.id))}
            className={({ isActive }) =>
              [chipBase, (isActive || value === ch.id) ? chipActive : chipInactive].join(" ")
            }
            title={
              ch.id === "temperature"     ? t("Temperature") :
              ch.id === "humidity"        ? t("Humidity") :
              ch.id === "pressure-room"   ? t("Room Pressure") :
              /* pressure-filter */          t("Filter Pressure")
            }
          >
            <FontAwesomeIcon icon={ch.iconL} className="text-sm" />
            <FontAwesomeIcon icon={ch.iconR} className="text-sm" />
            <span className="text-[11px] ml-auto">{ch.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
