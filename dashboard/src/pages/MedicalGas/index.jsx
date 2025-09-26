// src/pages/MedicalGas/index.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import { getAllGas } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useDispatch, useSelector } from "react-redux";

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

/** Dự phòng khi API lỗi/trống (0: Normal, 1: Fault) */
const SAMPLE = [
  { code: "O2", status: 0 },
  { code: "N2O", status: 0 },
  { code: "MA4", status: 0 },
  { code: "MA7", status: 0 },
  { code: "VA", status: 0 },
  { code: "CO2", status: 0 },
];

/** Chỉ giữ 0|1 và đúng ORDER */
function shapeGas(raw) {
  const norm = (v) => (Number(v) === 1 ? 1 : 0);
  const by = {};
  (raw || []).forEach((it) => {
    const code = String(it?.code ?? it?.keyword ?? "").toUpperCase();
    if (ORDER.includes(code)) by[code] = { code, status: norm(it?.status) };
  });
  return ORDER.map((c) => by[c] ?? SAMPLE.find((s) => s.code === c));
}

export default function MedicalGas() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const pollIntervalSec = useSelector((s) => s?.settings?.pollIntervalSec ?? 10);

  const [gas, setGas] = useState(SAMPLE);
  const [loading, setLoading] = useState(true);
  const [errText, setErrText] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const mountedRef = useRef(true);
  const timerRef = useRef(null);

  const loadGas = async () => {
    try {
      setErrText("");
      setLoading(true);
      const res = await getAllGas(); // API: GET /api/gas -> [{ code, status(0|1) }]
      const arr = Array.isArray(res?.data) ? res.data : [];
      if (!mountedRef.current) return;
      setGas(shapeGas(arr));
      setUpdatedAt(new Date());
    } catch (e) {
      dispatch(fetchDataFailure(e?.message ?? "getAllGas error"));
      if (!mountedRef.current) return;
      setGas(shapeGas([])); // fallback SAMPLE theo đúng ORDER
      setErrText(e?.message || "Failed to load gas status");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadGas();
    const ms = Math.max(1, Number(pollIntervalSec || 10)) * 1000;
    timerRef.current = setInterval(loadGas, ms);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIntervalSec]);

  /** Tính có lỗi tổng thể hay không (để đổi viền khối) */
  const hasAnyFault = useMemo(() => gas.some((g) => g.status === 1), [gas]);

  /** Nút hiển thị trạng thái: Normal/Fault */
  const StatusPill = ({ status }) => {
    return (
      <div className="min-w-[120px] flex justify-center">
        {status === 1 ? (
          <Fault lable={t("fault")} />
        ) : (
          <Normal lable={t("normal")} />
        )}
      </div>
    );
  };

  return (
    <div className="w-full px-3 md:px-6">
      <div className="w-full text-center capitalize">
        <Divider label={t("medical gas")} />
      </div>

      {/* trạng thái tải & lỗi */}
      <div className="flex flex-wrap items-center justify-center gap-3 my-2">
        <button
          onClick={loadGas}
          className="px-3 py-1 text-sm rounded-lg border border-slate-300 hover:bg-white"
        >
          {t("Refresh")}
        </button>
        {loading && <span className="text-sm text-slate-500">{t("Loading")}...</span>}
        {!!errText && <span className="text-sm text-rose-600">{errText}</span>}
        {!!updatedAt && !loading && (
          <span className="text-xs text-slate-400">
            {t("Updated")}: {updatedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Khối 6 khí: label + 1 trạng thái duy nhất */}
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

        <div className="h-3 md:h-4" />

        {/* Hàng trạng thái Normal/Fault */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {gas.map((g) => (
            <div key={g.code} className="flex justify-center">
              <div className="my-2">
                <StatusPill status={g.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
