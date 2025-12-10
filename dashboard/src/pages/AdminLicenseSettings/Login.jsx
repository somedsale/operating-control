// src/pages/Admin/Login.jsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Divider from "../../components/Divider";
// 🔔 báo cho RequireAdmin re-check sau login
import { emitAdminAuthChanged } from "./RequireAdmin";

async function postJSON(base, path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Login failed");
  return data;
}

export default function AdminLogin({ onLoggedIn }) {
  const apiBase =
    useSelector((s) => s.settings?.apiBaseUrl) || "http://localhost:5000";
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const canSubmit = username.trim() !== "" && password.trim() !== "";

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;

    setErr("");
    setBusy(true);
    try {
      // 1) Đăng nhập
      await postJSON(apiBase, "/api/auth/admin/login", {
        username: username.trim(),
        password: password.trim(),
      });

      // 2) Warm-up để đảm bảo cookie đã “có hiệu lực” với trình duyệt
      try {
        await fetch(apiBase + "/api/auth/admin/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
      } catch (_) {
        // bỏ qua lỗi warm-up
      }

      // 3) Thông báo cho RequireAdmin re-check ngay
      emitAdminAuthChanged();

      // 4) Điều hướng
      if (typeof onLoggedIn === "function") onLoggedIn();
      else nav("/admin/license", { replace: true });
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full px-4 pt-2 pb-4">
      <div className="text-center">
        <Divider label="Admin · Sign in" />
      </div>

      <div className="max-w-md mx-auto mt-6 bg-white/70 backdrop-blur rounded-2xl shadow-sm p-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-slate-600">Username</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-slate-600">Password</label>
            <div className="flex gap-2">
              <input
                type={showPwd ? "text" : "password"}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="mt-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-white"
                aria-label={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {err && <div className="text-rose-600 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="w-full px-4 py-3 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
