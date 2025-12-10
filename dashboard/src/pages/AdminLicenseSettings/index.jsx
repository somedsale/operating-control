// src/pages/Admin/LicenseSettings.jsx
import React, { useEffect, useState, useCallback } from "react";
import Divider from "../../components/Divider";
import { useSelector } from "react-redux";
import RequireAdmin from "./RequireAdmin";
import AdminLogin from "./Login";

const Card = ({ title, children, right }) => (
  <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="text-xl font-semibold text-slate-700">{title}</div>
      {right}
    </div>
    {children}
  </div>
);
const Row = ({ label, help, children }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 border-b last:border-0 border-slate-200">
    <div className="min-w-[220px]">
      <div className="text-slate-600">{label}</div>
      {help && <div className="text-xs text-slate-400 mt-0.5">{help}</div>}
    </div>
    <div className="min-w-[260px]">{children}</div>
  </div>
);
const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      checked ? "bg-emerald-500" : "bg-slate-300"
    }`}
    aria-pressed={checked}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
  </button>
);

/* ---------- API helpers (đã sửa credentials) ---------- */
const apiGet = async (base, path) => {
  const res = await fetch(base + path, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
};
const apiPut = async (base, path, body) => {
  const res = await fetch(base + path, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
};
const apiPost = async (base, path, body) => {
  const res = await fetch(base + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
};

function toInputDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function AdminLicenseSettingsInner() {
  const apiBase = useSelector((s) => s.settings?.apiBaseUrl) || "http://localhost:5000";

  const [installedAt, setInstalledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [trialDays, setTrialDays] = useState(30);
  const [activated, setActivated] = useState(false);
  const [licenseKeyPlaintext, setKey] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [pwdCur, setPwdCur] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdNew2, setPwdNew2] = useState("");

  const withMsg = (fn) => async (...args) => {
    setMsg(""); setErr(""); setBusy(true);
    try {
      await fn(...args);
    } catch (e) {
      setErr(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const load = useCallback(withMsg(async () => {
    const cfg = await apiGet(apiBase, "/api/license/admin/config");
    setInstalledAt(new Date(cfg.installedAt).toLocaleString());
    setExpiresAt(toInputDate(cfg.expiresAt));
    setTrialDays(Number(cfg.trialDays || 30));
    setActivated(!!cfg.activated);
    setMsg("Loaded.");
  }), [apiBase]);

  const save = useCallback(withMsg(async () => {
    await apiPut(apiBase, "/api/license/admin/config", {
      expiresAt: expiresAt || null,
      trialDays: Number(trialDays),
      activated,
      licenseKeyPlaintext: licenseKeyPlaintext.trim() || undefined,
    });
    setKey("");
    setMsg("Saved.");
  }), [apiBase, expiresAt, trialDays, activated, licenseKeyPlaintext]);

  const resetToTrial = useCallback(withMsg(async () => {
    await apiPut(apiBase, "/api/license/admin/config", { expiresAt: null });
    setExpiresAt("");
    setMsg("Reset to trial mode.");
  }), [apiBase]);

  const forceDeactivate = useCallback(withMsg(async () => {
    await apiPut(apiBase, "/api/license/admin/config", { activated: false });
    setActivated(false);
    setMsg("Deactivated.");
  }), [apiBase]);

  const changePwd = useCallback(withMsg(async () => {
    if (!pwdCur || !pwdNew || !pwdNew2) throw new Error("Điền đủ 3 ô mật khẩu.");
    if (pwdNew !== pwdNew2) throw new Error("Xác nhận mật khẩu mới không khớp.");
    await apiPost(apiBase, "/api/auth/admin/change-password", {
      currentPassword: pwdCur,
      newPassword: pwdNew,
    });
    setPwdCur(""); setPwdNew(""); setPwdNew2("");
    setMsg("Password changed.");
  }), [apiBase, pwdCur, pwdNew, pwdNew2]);

  const logout = useCallback(withMsg(async () => {
    await apiPost(apiBase, "/api/auth/admin/logout", {});
    window.location.reload();
  }), [apiBase]);

  useEffect(() => { load(); }, [load]);

  return (
    /* ---- Layout có thể cuộn ---- */
    <div className="flex flex-col h-[100dvh]">
      {/* Sticky header */}
      <div className="shrink-0 sticky top-0 z-10 bg-blue-50/70 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="w-full px-4 pt-2 pb-2">
          <div className="text-center">
            <Divider label="Admin · License Settings" />
          </div>
        </div>
      </div>

      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 pb-4">
          <div className="max-w-5xl mx-auto grid grid-cols-12 gap-6 mt-4">
            <div className="col-span-12 lg:col-span-10 xl:col-span-8 space-y-6">

              {/* Account */}
              <Card title="Admin Account" right={
                <button onClick={logout} disabled={busy}
                  className="px-3 py-1.5 rounded-xl border text-sm border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  Logout
                </button>
              }>
                <Row label="Current password">
                  <input type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                        value={pwdCur} onChange={(e)=>setPwdCur(e.target.value)} />
                </Row>
                <Row label="New password">
                  <input type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                        value={pwdNew} onChange={(e)=>setPwdNew(e.target.value)} />
                </Row>
                <Row label="Confirm new password">
                  <input type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                        value={pwdNew2} onChange={(e)=>setPwdNew2(e.target.value)} />
                </Row>
                <div className="pt-3">
                  <button onClick={changePwd} disabled={busy}
                          className="px-6 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    Change password
                  </button>
                </div>
              </Card>

              {/* License config */}
              <Card title="License Configuration" right={
                <div className="flex gap-2">
                  <button onClick={resetToTrial} disabled={busy}
                    className="px-3 py-1.5 rounded-xl border text-sm border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50">
                    Reset to trial
                  </button>
                  <button onClick={forceDeactivate} disabled={busy}
                    className="px-3 py-1.5 rounded-xl border text-sm border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                    Force deactivate
                  </button>
                </div>
              }>
                <Row label="Installed at">
                  <input type="text" value={installedAt || ""} disabled
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50 text-slate-500" />
                </Row>
                <Row
                  label="Expiration date"
                  help="Để trống để dùng chế độ trial theo trialDays. Nếu đặt ngày, hệ thống tính đến 23:59:59 giờ VN."
                >
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e)=>setExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </Row>
                <Row label="Trial days (fallback)">
                  <input
                    type="number"
                    min={0}
                    value={trialDays}
                    onChange={(e)=>setTrialDays(Number(e.target.value || 0))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </Row>
                <Row label="Activated">
                  <Toggle checked={activated} onChange={setActivated}/>
                </Row>
                <Row
                  label="License Key (plain text)"
                  help="Server sẽ hash SHA-256 và lưu licenseHash. Để trống nếu không muốn đổi key."
                >
                  <input
                    type="text"
                    value={licenseKeyPlaintext}
                    onChange={(e)=>setKey(e.target.value)}
                    placeholder="Nhập key mới…"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </Row>
                <div className="pt-3 flex gap-3 items-center">
                  <button onClick={save} disabled={busy}
                          className="px-6 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={load} disabled={busy}
                          className="px-6 py-3 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50">
                    Load
                  </button>
                  {!!msg && <span className="text-emerald-600">{msg}</span>}
                  {!!err && <span className="text-rose-600">{err}</span>}
                </div>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLicenseSettings() {
  const [logged, setLogged] = useState(false);
  return (
    <RequireAdmin fallback={<AdminLogin onLoggedIn={()=>setLogged(true)} />}>
      <AdminLicenseSettingsInner />
    </RequireAdmin>
  );
}
