// src/components/LicenseGate.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { apiJson } from "../../utils/api";

/* ===== API helpers ===== */
async function getLicenseStatus() {
  // GET /api/license/status -> { activated, left, over, trialDays }
  return apiJson("/api/license/status");
}
async function activateLicense(key) {
  // POST /api/license/activate { key } -> { ok: true }
  return apiJson("/api/license/activate", { method: "POST", body: { key } });
}

/* ===== small utils ===== */
function matchPath(pattern, pathname) {
  if (!pattern) return false;
  // support "prefix/*"
  if (pattern.endsWith("/*")) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(base + "/");
  }
  return pathname === pattern;
}
function isBypassed(pathname, allowed) {
  return Array.isArray(allowed) && allowed.some((p) => matchPath(p, pathname));
}

/* ===== UI ===== */
function LockScreen({ onActivate, daysOver }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await activateLicense(key.trim());
      onActivate(); // refetch status ở parent
    } catch (e) {
      setErr(e.message || "Kích hoạt thất bại. Vui lòng kiểm tra key.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#0f172a,#111827)", color: "#fff", padding: 24, zIndex: 99999
    }}>
      <div style={{ width: 440, maxWidth: "92vw", background: "#0b1220", borderRadius: 20, padding: 24, boxShadow: "0 15px 60px rgba(0,0,0,.5)" }}>
        <h2 style={{ margin: "0 0 4px 0", fontSize: 22 }}>Ứng dụng đã hết hạn dùng thử</h2>
        <div style={{ opacity: .85, marginBottom: 16 }}>
          Bạn đã vượt quá thời hạn dùng thử. (Quá hạn: {Math.abs(daysOver)} ngày)
        </div>

        <form onSubmit={submit}>
          <label htmlFor="license_key" style={{ fontSize: 14, opacity: .9 }}>Nhập License Key để kích hoạt:</label>
          <input
            id="license_key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Nhập key…"
            autoFocus
            disabled={busy}
            style={{
              width: "100%", padding: "12px 14px", marginTop: 8, marginBottom: 12,
              background: "#0f172a", color: "#e5e7eb", border: "1px solid #24324a", borderRadius: 10, outline: "none"
            }}
          />
          {err && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button type="submit" disabled={busy} style={{
            width: "100%", padding: "12px 14px", borderRadius: 10, border: "none",
            background: busy ? "#1e40af" : "#2563eb", color: "#fff", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600
          }}>
            {busy ? "Đang kích hoạt..." : "Kích hoạt"}
          </button>
        </form>
      </div>
    </div>
  );
}

function TrialBanner({ left }) {
  if (left <= 0) return null;
  return (
    <div style={{
      position: "fixed", right: 12, bottom: 12, zIndex: 9999,
      background: "#111827cc", color: "#e5e7eb", padding: "8px 12px", borderRadius: 10,
      border: "1px solid #263042", fontSize: 13
    }}>
      Trial: còn {left} ngày
    </div>
  );
}

/* ===== Component chính ===== */
export default function LicenseGate({
  children,
  showTrialBadge = false,
  /** Các path được phép bỏ qua kiểm tra license. Hỗ trợ wildcard "/admin/*". */
  allowedPaths = ["/admin/license"],
}) {
  const { pathname } = useLocation();
  const bypass = isBypassed(pathname, allowedPaths);

  const [state, setState] = useState({
    loading: true,
    activated: false,
    left: 0,
    over: 0,
    trialDays: 30,
    error: "",
  });

  const refresh = useCallback(async () => {
    try {
      const s = await getLicenseStatus();
      setState({
        loading: false,
        activated: !!s.activated,
        left: Number(s.left || 0),
        over: Number(s.over || 0),
        trialDays: Number(s.trialDays || 30),
        error: "",
      });
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e.message || "Không lấy được trạng thái license.",
      }));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onActivated = useCallback(() => { refresh(); }, [refresh]);

  // Nếu route hiện tại nằm trong whitelist → bỏ qua mọi chặn
  if (bypass) {
    return <>{children}</>;
  }

  if (state.loading) return null; // hoặc spinner
  if (state.error) {
    return (
      <div style={{ padding: 16, color: "#ef4444", fontFamily: "sans-serif" }}>
        Lỗi license: {state.error}
      </div>
    );
  }

  // Đã active → vào app
  if (state.activated) return <>{children}</>;

  // Chưa active:
  if (state.left <= 0) {
    // Hết hạn → khoá cứng
    return <LockScreen onActivate={onActivated} daysOver={state.over} />;
  }

  // Còn trial → cho vào, optionally hiện banner
  return (
    <>
      {children}
      {showTrialBadge && <TrialBanner left={state.left} />}
    </>
  );
}
