// src/pages/Power/index.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import { getAllPower } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useDispatch } from "react-redux";

/** Thứ tự & nhãn hiển thị cố định trên UI */
const TILES = [
  { key: "ups", title: "UPS Status" },
  { key: "ips", title: "IPS Status" },
  { key: "main", title: "Main Supply Status" },
];

/** API helper */
const API_BASE = process.env.REACT_APP_API_BASE || "";
async function apiJson(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/** Chuẩn hoá dữ liệu API -> khớp TILES theo key */
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

/** DeviceId relay cho IPS */
const IPS_RELAY_ID = "ips_relay";

export default function Power() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [tiles, setTiles] = useState(shapePower([]));
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  // IPS actions
  const [ipsBusy, setIpsBusy] = useState(false);

  // Trạng thái relay IPS (đọc từ /api/devices)
  const [relayOn, setRelayOn] = useState(false);
  const [relayBusy, setRelayBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErrText("");
      const res = await getAllPower(); // GET /api/power
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

  // Load trạng thái relay từ /api/devices
  const loadRelay = useCallback(async () => {
    try {
      const list = await apiJson("/api/devices"); // [{ deviceId, isOn, hwOn }]
      const row = Array.isArray(list)
        ? list.find((d) => d.deviceId === IPS_RELAY_ID)
        : null;
      const on =
        typeof row?.hwOn === "boolean"
          ? row.hwOn
          : typeof row?.isOn === "boolean"
          ? row.isOn
          : false;
      setRelayOn(on);
    } catch (e) {
      // giữ nguyên trạng thái cũ nếu lỗi
      dispatch(fetchDataFailure(e?.message ?? "load IPS relay error"));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
    loadRelay();
  }, [fetchData, loadRelay]);

  /** SILENCE IPS ALARM (không cần thời gian) */
  const handleSilenceIPS = async () => {
    try {
      setIpsBusy(true);
      await apiJson(`/api/power/ips/mute`, { method: "PATCH" }); // server tự áp dụng mặc định
      await fetchData(); // refresh trạng thái
    } catch (e) {
      dispatch(fetchDataFailure(e?.message ?? "IPS mute error"));
      setErrText(e?.message || "IPS mute failed");
    } finally {
      setIpsBusy(false);
    }
  };

  /** BẬT/TẮT RELAY IPS */
  const handleToggleRelay = async () => {
    const next = !relayOn;
    try {
      setRelayBusy(true);
      // optimistic UI
      setRelayOn(next);
      await apiJson(`/api/devices/${IPS_RELAY_ID}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: next }),
      });
      await loadRelay(); // đồng bộ lại từ BE
    } catch (e) {
      setRelayOn((v) => !v); // rollback
      dispatch(fetchDataFailure(e?.message ?? "toggle IPS relay error"));
      setErrText(e?.message || "Toggle IPS relay failed");
    } finally {
      setRelayBusy(false);
    }
  };

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
          onClick={() => {
            fetchData();
            loadRelay();
          }}
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

            {/* Hành động riêng cho IPS */}
            {card.key === "ips" &&
              card.status && ( // ⬅️ chỉ render khi IPS Fault
                <div className="mt-4 w-full">
                  <div className="flex flex-col items-center gap-3">
                    {/* Nút bật/tắt relay IPS */}
                    <button
                      onClick={handleToggleRelay}
                      disabled={relayBusy}
                      className={[
                        "px-4 py-2 rounded-lg border-2 font-medium transition",
                        relayBusy
                          ? "opacity-60 cursor-not-allowed border-slate-300 text-slate-500"
                          : relayOn
                          ? "border-rose-500 text-rose-700 hover:bg-rose-50"
                          : "border-emerald-500 text-emerald-700 hover:bg-emerald-50",
                      ].join(" ")}
                      title={
                        relayOn
                          ? t("Turn OFF IPS relay")
                          : t("Turn ON IPS relay")
                      }
                    >
                      {relayBusy
                        ? t("Processing…")
                        : relayOn
                        ? t("Turn OFF IPS Relay")
                        : t("Turn ON IPS Relay")}
                    </button>

                    {/* Silence IPS Alarm */}
                    <button
                      onClick={handleSilenceIPS}
                      disabled={ipsBusy}
                      className="px-4 py-2 rounded-lg border-2 border-amber-500 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                      title={t("Silence IPS alarm")}
                    >
                      {ipsBusy ? t("Processing…") : t("Silence IPS Alarm")}
                    </button>
                  </div>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
