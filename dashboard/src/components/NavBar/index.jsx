import React from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setActive } from "../../store/activeSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faFan,
  faRectangleList,
  faPlug,
  faGaugeSimpleHigh,
  faClockRotateLeft,
  faThermometerHalf,
  faDroplet,
  faChartBar,
  faChartLine,
  faStopwatch,            // ⬅️ thêm icon Timer
} from "@fortawesome/free-solid-svg-icons";

const items = [
  { id: "lighting",     to: "/lighting",     icon: faLightbulb,        label: "Lighting" },
  // { id: "ventilation",  to: "/ventilation",  icon: faFan,              label: "Ventilation" },
  { id: "control",      to: "/control",      icon: faRectangleList,    label: "Controls" },
  { id: "power",        to: "/power",        icon: faPlug,             label: "Power" },
  { id: "medical-gas",  to: "/medical-gas",  icon: faGaugeSimpleHigh,  label: "Gas" },
  { id: "timer",        to: "/timer",        icon: faStopwatch,        label: "Timer" }, // ⬅️ thêm tab Timer
  { id: "history",      to: "/history",      icon: faClockRotateLeft,  label: "History" },
];

const baseBtn =
  "flex items-center gap-3 w-full rounded-[20px] px-4 py-3 border-2 shadow-sm bg-white/70 backdrop-blur transition";
const inactive =
  "border-gray-300 text-gray-500 hover:bg-white hover:border-gray-400";
const active =
  "border-blue-400 text-blue-700 bg-blue-50 ring-1 ring-blue-200";

const iconWrap = (isActive) =>
  [
    "w-10 h-10 grid place-items-center rounded-full border-2",
    isActive ? "border-blue-400 text-blue-600 bg-white" : "border-gray-300 text-gray-500 bg-white",
  ].join(" ");

// style cho chip GRAPH
const chipBase =
  "flex items-center gap-2 rounded-[16px] px-3 py-2 border-2 shadow-sm transition bg-white/70";
const chipInactive = "border-gray-300 text-gray-500 hover:border-gray-400";
const chipActive = "border-blue-400 text-blue-700 bg-blue-50 ring-1 ring-blue-200";

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
            [baseBtn, (isActive || value === it.id) ? active : inactive].join(" ")
          }
        >
          {({ isActive }) => (
            <>
              <div className={iconWrap(isActive || value === it.id)}>
                <FontAwesomeIcon icon={it.icon} />
              </div>
              <span className="text-base font-semibold">
                {t(it.label.toLowerCase())}
              </span>
            </>
          )}
        </NavLink>
      ))}

      {/* Quick chips (GRAPH) có trạng thái active */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <NavLink
          to="/temperature"
          onClick={() => dispatch(setActive("temperature"))}
          className={({ isActive }) =>
            [chipBase, (isActive || value === "temperature") ? chipActive : chipInactive].join(" ")
          }
        >
          <FontAwesomeIcon icon={faThermometerHalf} className="text-sm" />
          <FontAwesomeIcon icon={faChartBar} className="text-sm" />
          <span className="text-[11px] ml-auto">GRAPH</span>
        </NavLink>

        <NavLink
          to="/humidity"
          onClick={() => dispatch(setActive("humidity"))}
          className={({ isActive }) =>
            [chipBase, (isActive || value === "humidity") ? chipActive : chipInactive].join(" ")
          }
        >
          <FontAwesomeIcon icon={faDroplet} className="text-sm" />
          <FontAwesomeIcon icon={faChartLine} className="text-sm" />
          <span className="text-[11px] ml-auto">GRAPH</span>
        </NavLink>
      </div>
    </aside>
  );
}
