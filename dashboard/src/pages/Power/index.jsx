import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import { getAllPower /*, updatePower*/ } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useDispatch } from "react-redux";

/** Thứ tự & nhãn hiển thị cố định trên UI */
const TILES = [
  { key: "ups",  title: "UPS Status" },
  { key: "ips",  title: "IPS Status" },
  { key: "main", title: "Main Supply Status" },
];

/** Chuẩn hoá dữ liệu API -> khớp TILES theo key (không phụ thuộc thứ tự trả về) */
function shapePower(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const byKey = Object.fromEntries(
    arr.map((it) => [String(it?.key || "").toLowerCase(), Boolean(it?.status)])
  );
  return TILES.map((t) => ({
    ...t,
    status: !!byKey[t.key], // true = Fault/Alarm, false = Normal
  }));
}

export default function Power() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [tiles, setTiles] = useState(shapePower([]));
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrText("");
      const res = await getAllPower();            // GET /api/power -> [{ key, title, status:boolean }]
      setTiles(shapePower(res?.data));
      setUpdatedAt(new Date());
    } catch (e) {
      dispatch(fetchDataFailure(e?.message ?? "getAllPower error"));
      setTiles(shapePower([]));
      setErrText(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
    // const id = setInterval(fetchData, 15000);
    // return () => clearInterval(id);
  }, [fetchData]);

  return (
    <div className="w-full px-3 md:px-6">
      <div className="w-full text-center capitalize">
        <Divider label={t("power")} />
      </div>

      {/* trạng thái tải & nút refresh */}
      <div className="mb-3 flex items-center justify-center gap-3 text-sm text-slate-600">
        {loading ? <span>{t("Loading")}...</span> : null}
        {errText ? <span className="text-rose-600">{errText}</span> : null}
        <button
          onClick={fetchData}
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
        >
          {t("Refresh")}
        </button>
        {updatedAt && (
          <span className="text-slate-400">
            {t("Updated at")}: {updatedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {tiles.map((card) => (
          <div
            key={card.key}
            className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-5 md:p-6 flex flex-col items-center justify-between"
          >
            <div className="text-[clamp(18px,2.2vw,26px)] font-semibold text-slate-700 text-center">
              {t(card.title)}
            </div>

            <div className="mt-4 md:mt-6">
              <div className="min-w-[150px] flex justify-center">
                {/* status: true = Fault, false = Normal */}
                {card.status ? (
                  <Fault lable={t("fault")} />
                ) : (
                  <Normal lable={t("normal")} />
                )}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
