// src/pages/MedicalGas/index.jsx
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import { useSelector } from "react-redux";
import {
  selectGas, selectGasLoading, selectGasError, selectGasUpdatedAt,
} from "../../features/status/statusSlice";

/** Thứ tự cố định 6 khí */
const ORDER = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];

/** Nhãn hiển thị (i18n) */
const LABEL = {
  O2: "oxygen",
  N2O: "nitrous oxide",
  MA4: "medical air 4",
  MA7: "medical air 7",
  VA: "vacuum",
  CO2: "carbon dioxide",
};

/** Hai hàng: High (trên), Low (dưới) */
function StatusPair({ code, status, t }) {
  const statusNum = Number(status);
  const hasHigh = code !== "VA";
  const isHigh = statusNum === 1;
  const isLow  = statusNum === 2;

  const HighPill = isHigh
    ? <Fault lable={String(t("High")).toUpperCase()} />
    : <Normal lable={String(t("High")).toUpperCase()} />;

  const LowPill = isLow
    ? <Fault lable={String(t("Low")).toUpperCase()} />
    : <Normal lable={String(t("Low")).toUpperCase()} />;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="min-h-[36px] flex items-center justify-center">
        {hasHigh ? (
          HighPill
        ) : (
          <div className="invisible pointer-events-none">
            <Normal lable={String(t("High")).toUpperCase()} />
          </div>
        )}
      </div>
      <div className="min-h-[36px] flex items-center justify-center">
        {LowPill}
      </div>
    </div>
  );
}

export default function MedicalGas() {
  const { t } = useTranslation();

  // đọc từ Redux
  const gas = useSelector(selectGas);               // [{code,status,fault}]
  const loading = useSelector(selectGasLoading);
  const errText = useSelector(selectGasError);
  const updatedAtMs = useSelector(selectGasUpdatedAt);

  const hasAnyFault = useMemo(() => gas.some((g) => g.status !== 0), [gas]);

  return (
    <div className="w-full px-3 md:px-6">
      <div className="w-full text-center capitalize">
        <Divider label={t("medical gas")} />
      </div>

      {/* trạng thái tải & lỗi */}
      <div className="flex flex-wrap items-center justify-center gap-3 my-2">
        {loading && <span className="text-sm text-slate-500">{t("Loading")}...</span>}
        {!!errText && <span className="text-sm text-rose-600">{errText}</span>}
        {!!updatedAtMs && !loading && (
          <span className="text-xs text-slate-400">
            {t("Updated")}: {new Date(updatedAtMs).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Khối 6 khí */}
      <div
        className={[
          "rounded-2xl p-4 md:p-6 shadow-sm backdrop-blur",
          "bg-white/70",
          hasAnyFault ? "ring-2 ring-rose-300/70" : "ring-1 ring-slate-200/60",
        ].join(" ")}
      >
        {/* Hàng tiêu đề */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 text-[clamp(14px,1.6vw,20px)] uppercase font-semibold text-center text-slate-700">
          {gas.map((g) => (
            <div key={g.code}>{t(LABEL[g.code])}</div>
          ))}
        </div>

        <div className="h-2 md:h-3" />

        {/* Hàng trạng thái */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {gas.map((g) => (
            <div key={g.code} className="flex justify-center">
              <StatusPair code={g.code} status={g.status} t={t} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
