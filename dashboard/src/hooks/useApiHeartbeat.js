// Ping /api/health định kỳ để biết API còn sống không
import { useEffect, useState } from "react";
import { apiJson } from "../utils/api";

export function useApiHeartbeat(intervalMs = 10_000) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let t;
    let cancelled = false;

    const ping = async () => {
      try {
        // timeout ngắn để UI phản hồi nhanh
        await apiJson("/api/health", {}, { timeoutMs: 3000, retries: 0 });
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        t = setTimeout(ping, intervalMs);
      }
    };

    ping();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [intervalMs]);

  return online;
}
