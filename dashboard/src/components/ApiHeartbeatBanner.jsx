import React from "react";
import { useApiHeartbeat } from "../hooks/useApiHeartbeat";

export default function ApiHeartbeatBanner({ intervalMs = 10_000 }) {
  const apiAlive = useApiHeartbeat(intervalMs);

  if (apiAlive) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 text-sm text-black bg-amber-400/90 py-2 text-center">
      Mất kết nối máy chủ. Hệ thống sẽ tự thử lại...
    </div>
  );
}
