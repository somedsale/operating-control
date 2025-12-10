import React, { useEffect, useState } from "react";

/**
 * 🔔 PlcConnectionBanner.jsx
 * Hiển thị banner đỏ cảnh báo khi PLC mất kết nối.
 * - Ping /api/plc/health mỗi 5s
 * - Nếu mất phản hồi liên tiếp hoặc ok=false → báo lỗi
 * - Có hiệu ứng nhấp nháy nhẹ và tự động ẩn lại khi kết nối trở lại
 */
export default function PlcConnectionBanner() {
  const [ok, setOk] = useState(true);
  const [lastOk, setLastOk] = useState(Date.now());
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    const pollMs = 5000;
    let timer;

    const check = async () => {
      try {
        const res = await fetch("/api/plc/health", { cache: "no-store" });
        const json = await res.json();

        if (json?.ok) {
          setOk(true);
          setFailCount(0);
          setLastOk(Date.now());
        } else {
          setFailCount((n) => n + 1);
          if (failCount >= 2) setOk(false); // sau 2 lần lỗi liên tiếp (~10s)
        }
      } catch (err) {
        setFailCount((n) => n + 1);
        if (failCount >= 2) setOk(false);
      }

      timer = setTimeout(check, pollMs);
    };

    check();
    return () => clearTimeout(timer);
  }, [failCount]);

  if (ok) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-gradient-to-r from-red-600 to-red-700 text-white text-center py-2 font-semibold shadow-[0_-2px_6px_rgba(0,0,0,0.3)] animate-pulse">
      ⚠️ MẤT KẾT NỐI PLC — vui lòng kiểm tra đường truyền hoặc nguồn PLC!
    </div>
  );
}
