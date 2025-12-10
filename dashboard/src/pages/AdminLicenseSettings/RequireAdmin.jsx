// src/components/RequireAdmin.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

/**
 * Gọi hàm này sau khi login/logout thành công để RequireAdmin re-check ngay.
 * VD trong Login.jsx sau khi login OK:
 *   import { emitAdminAuthChanged } from "../../components/RequireAdmin";
 *   emitAdminAuthChanged();
 */
export function emitAdminAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin:auth-changed"));
  }
}

export default function RequireAdmin({
  children,
  fallback = null,
  loading = null,
  recheckOn = ["focus", "visibilitychange", "admin:auth-changed"],
}) {
  const apiBase =
    useSelector((s) => s.settings?.apiBaseUrl) || "http://localhost:5000";

  const [status, setStatus] = useState("checking"); // 'checking' | 'ok' | 'no'
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const check = useCallback(() => {
    const ac = new AbortController();
    // set trạng thái checking khi thực sự cần (tránh flicker)
    setStatus((prev) => (prev === "checking" ? prev : "checking"));

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/auth/admin/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
          headers: {
            // Giúp trình duyệt không dùng cache cũ (một số proxy/local setups)
            "Cache-Control": "no-cache, no-store, max-age=0",
            Pragma: "no-cache",
          },
        });

        if (!mountedRef.current) return;
        if (res.ok) setStatus("ok");
        else setStatus("no"); // 401/403/khác -> coi như chưa login
      } catch (e) {
        if (!mountedRef.current) return;
        if (e?.name !== "AbortError") setStatus("no");
      }
    })();

    return () => ac.abort();
  }, [apiBase]);

  // Check khi mount & khi apiBase đổi
  useEffect(() => {
    const cancel = check();
    return cancel;
  }, [check]);

  // Lắng nghe sự kiện để re-check phiên
  useEffect(() => {
    const onFocus = () => check();
    const onVis = () =>
      document.visibilityState === "visible" && check();
    const onAuthChanged = () => check();

    if (recheckOn.includes("focus")) window.addEventListener("focus", onFocus);
    if (recheckOn.includes("visibilitychange"))
      document.addEventListener("visibilitychange", onVis);
    if (recheckOn.includes("admin:auth-changed"))
      window.addEventListener("admin:auth-changed", onAuthChanged);

    return () => {
      if (recheckOn.includes("focus"))
        window.removeEventListener("focus", onFocus);
      if (recheckOn.includes("visibilitychange"))
        document.removeEventListener("visibilitychange", onVis);
      if (recheckOn.includes("admin:auth-changed"))
        window.removeEventListener("admin:auth-changed", onAuthChanged);
    };
  }, [check, recheckOn]);

  if (status === "checking") {
    return (
      loading ?? (
        <div className="w-full px-4 pt-6 pb-8 flex items-center justify-center">
          <div className="animate-pulse text-slate-500 text-sm">
            Checking admin session…
          </div>
        </div>
      )
    );
  }

  return status === "ok" ? children : fallback;
}
