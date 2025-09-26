import { useSelector } from "react-redux";

/** Chuẩn hoá mọi kiểu nhập về "24h" hoặc "12h" */
const normalizeTimeFormat = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (s === "12h" || s === "12" || s === "h12" || s === "12-hour") return "12h";
  return "24h";
};

/** Đọc dự phòng từ localStorage (hỗ trợ cả v1, v2) */
const readTimeFormatFromLS = () => {
  try {
    const raw2 = localStorage.getItem("app.settings.v2");
    if (raw2) {
      const p = JSON.parse(raw2);
      if (p?.timeFormat) return normalizeTimeFormat(p.timeFormat);
    }
  } catch {}
  try {
    const raw1 = localStorage.getItem("app.settings.v1");
    if (raw1) {
      const p = JSON.parse(raw1);
      if (p?.timeFormat) return normalizeTimeFormat(p.timeFormat);
    }
  } catch {}
  return "24h";
};

/**
 * Hook trả về "24h" | "12h"
 * - Chỉ gọi useSelector 1 lần (đúng quy tắc Hooks)
 * - Fallback sang localStorage nếu store chưa có
 */
export default function useTimeFormat() {
  const fromStore = useSelector(
    (s) => s?.settings?.timeFormat ?? s?.settings?.value?.timeFormat
  );
  return normalizeTimeFormat(fromStore ?? readTimeFormatFromLS());
}
