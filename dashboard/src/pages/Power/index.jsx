// src/pages/Power/index.jsx
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import { useDispatch, useSelector } from "react-redux";
import {
  selectPower, selectPowerLoading, selectPowerError, selectPowerUpdatedAt,
  // (relay selectors – giữ nếu bạn vẫn cần)
  selectRelayOn, selectRelayLoading, selectRelayError,
  fetchPower, fetchRelay,
  // incident / dismiss
  selectIpsFault, selectIpsIncidentId, selectIpsDismissedIncidentId,
  dismissIpsAlarmOnce,
} from "../../features/status/statusSlice";

const TILES = [{ key: "ips", title: "IPS Status" }];

export default function Power() {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // dữ liệu power tổng
  const tiles = useSelector(selectPower);
  const loading = useSelector(selectPowerLoading);
  const errText = useSelector(selectPowerError);
  const updatedAtMs = useSelector(selectPowerUpdatedAt);

  // (optional) relay – giữ cho tương thích
  const relayOn = useSelector(selectRelayOn);
  const relayBusy = useSelector(selectRelayLoading);
  const relayErr = useSelector(selectRelayError);

  // incident logic
  const ipsFault = useSelector(selectIpsFault);
  const ipsIncidentId = useSelector(selectIpsIncidentId);
  const ipsDismissedIncidentId = useSelector(selectIpsDismissedIncidentId);

  const showIpsDismissBtn = ipsFault && ipsDismissedIncidentId < ipsIncidentId;

  useEffect(() => {
    dispatch(fetchPower());
    dispatch(fetchRelay()); // nếu không dùng relay nữa có thể bỏ
  }, [dispatch]);

  const handleDismissIps = () => {
    // 1) Đánh dấu "đã tắt báo động" cho đợt lỗi hiện tại (ẩn nút cho đến khi có lỗi mới)
    dispatch(dismissIpsAlarmOnce());

    // 2) Tắt tiếng ngay (thông báo cho GlobalAlarm)
    try {
      localStorage.setItem("alarmMuted", "1");
      // ràng buộc mute theo sự cố hiện thời (IPS)
      // GlobalAlarm sẽ tự lấy signature hiện tại (bao gồm P:ips nếu có)
      window.dispatchEvent(new CustomEvent("alarm:mute-now"));
    } catch {}
  };

  return (
    <div className="w-full px-3 md:px-6">
      <div className="w-full text-center capitalize">
        <Divider label={t("power")} />
      </div>

      <div className="mb-3 flex items-center justify-center gap-3 text-sm text-slate-600">
        {loading ? <span>{t("Loading")}...</span> : null}
        {errText ? <span className="text-rose-600">{errText}</span> : null}
        {relayErr ? <span className="text-rose-600">{relayErr}</span> : null}
        {updatedAtMs && (
          <span className="text-slate-400">
            {t("Updated at")}: {new Date(updatedAtMs).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {TILES.map((card) => {
          const data = tiles.find((x) => x.key === card.key) || { fault: false };
          return (
            <div
              key={card.key}
              className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-5 md:p-6 flex flex-col items-center justify-between"
            >
              <div className="text-[clamp(18px,2.2vw,26px)] font-semibold text-slate-700 text-center">
                {t(card.title)}
              </div>

              {/* ✅ Nút TẮT BÁO ĐỘNG IPS — chỉ 1 lần cho mỗi đợt lỗi + tắt tiếng ngay */}
              {card.key === "ips" && showIpsDismissBtn && (
                <div className="mt-4 w-full">
                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDismissIps}
                      className={[
                        "px-4 py-2 rounded-lg border-2 font-medium transition",
                        "border-rose-500 text-rose-700 hover:bg-rose-50",
                      ].join(" ")}
                      title={t("Tắt báo động IPS")}
                    >
                      {t("Tắt báo động IPS")}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 md:mt-6">
                <div className="min-w-[150px] flex justify-center">
                  {data.fault ? <Fault lable={t("fault")} /> : <Normal lable={t("normal")} />}
                </div>
              </div>

              {/* (optional) hiển thị relay */}
              {false && (
                <div className="mt-2 text-xs text-slate-500">
                  Relay: {relayBusy ? t("Processing…") : relayOn ? "ON" : "OFF"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
