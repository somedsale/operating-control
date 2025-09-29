// src/pages/Settings/index.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Divider from "../../components/Divider";
import { resetSettings, replaceSettings } from "../../store/settingsSlice";

/* ---------- UI bits ---------- */
const Card = ({ title, children }) => (
  <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-6">
    <div className="text-xl font-semibold text-slate-700 mb-4">{title}</div>
    {children}
  </div>
);
const Row = ({ label, children }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 border-b last:border-0 border-slate-200">
    <div className="text-slate-600">{label}</div>
    <div className="min-w-[240px]">{children}</div>
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
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

/* ---------- API helper ---------- */
const apiFetch = async (url, { method = "GET", body, headers } = {}, base = "") => {
  const res = await fetch((base || "") + url, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
};

/* ---------- Page ---------- */
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const settings = useSelector((s) => s.settings);
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("general"); // general | relays | alarms | api
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Thiết bị lấy từ API (đã sort)
  const [apiDevices, setApiDevices] = useState([]);          // [{id,name,relay?...}]
  const [devLoading, setDevLoading] = useState(false);
  const [devErr, setDevErr] = useState("");

  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => {
    i18n.changeLanguage(draft.language || "en");
  }, [draft.language, i18n]);
  useEffect(() => {
    const root = document.documentElement;
    draft.theme === "dark" ? root.classList.add("dark") : root.classList.remove("dark");
  }, [draft.theme]);

  const onChange = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const onSave = () => {
    dispatch(replaceSettings(draft));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const onBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(settings?.defaultRoute || "/lighting");
  };
  const onReset = () => {
    dispatch(resetSettings());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const languages = useMemo(
    () => [
      { value: "en", label: "English" },
      { value: "vi", label: "Tiếng Việt" },
    ],
    []
  );

  /* ---------- API base ---------- */
  const apiBase = draft.apiBaseUrl || "http://localhost:5000";

  /* ---------- Lấy & sort tất cả devices từ API DB ---------- */
  const fetchAllDevices = useCallback(async () => {
    try {
      setDevLoading(true);
      setDevErr("");
      // BE: GET /api/devices -> [{ deviceId, name, relay, ... }]
      const list = await apiFetch("/api/devices", {}, apiBase);
      const arr = Array.isArray(list) ? list : [];
      // sort: name asc (locale), fallback deviceId
      arr.sort((a, b) => {
        const an = String(a?.name || "").trim();
        const bn = String(b?.name || "").trim();
        const ai = String(a?.deviceId || "").trim();
        const bi = String(b?.deviceId || "").trim();
        const byName = an.localeCompare(bn, undefined, { sensitivity: "base" });
        return byName !== 0 ? byName : ai.localeCompare(bi);
      });
      // map sang cấu trúc row cho bảng relay
      const rows = arr.map((d) => ({
        id: String(d.deviceId),
        name: d.name || d.deviceId,
        relay: Number(d.relay || 0),
      }));
      setApiDevices(rows);
      // Nếu user chưa có mapping trong draft, khởi tạo bằng danh sách từ API
      setDraft((prev) => {
        if (Array.isArray(prev.relayMap) && prev.relayMap.length) return prev;
        return { ...prev, relayMap: rows };
      });
    } catch (e) {
      setDevErr(e.message || "Failed to load devices");
      // fallback: giữ nguyên relayMap trong draft nếu có, không thì để rỗng
    } finally {
      setDevLoading(false);
    }
  }, [apiBase]);

  // Tự fetch khi vào tab "relays" lần đầu hoặc đổi apiBase
  useEffect(() => {
    if (tab === "relays") fetchAllDevices();
  }, [tab, fetchAllDevices]);
  useEffect(() => {
    // nếu người dùng đổi API base ở tab Data & API, lần sang tab relays sẽ dùng base mới
  }, [apiBase]);

  /* ---------- Relays tab state (persist in draft) ---------- */
  const relayTotal = Number(draft.relayTotal ?? 16);

  // Sinh mapping tuần tự dựa trên danh sách hiện có (ưu tiên apiDevices)
  const seqRelayRows = useCallback(
    (total) => {
      const source = apiDevices.length
        ? apiDevices
        : [
            // fallback cứng nếu BE không trả gì
            { id: "in_use", name: "In Use" },
            { id: "operating_lamp", name: "Operating Lamp" },
            { id: "xray", name: "X-Ray" },
            { id: "uv", name: "UV" },
            { id: "heat_lamp", name: "Heating Lamp" },
            { id: "general_light", name: "General Light" },
            { id: "light_1", name: "Light 1" },
            { id: "light_2", name: "Light 2" },
            { id: "light_3", name: "Light 3" },
            { id: "light_4", name: "Light 4" },
          ];
      return source.map((row, idx) => ({
        ...row,
        relay: idx < total ? idx + 1 : 0,
      }));
    },
    [apiDevices]
  );

  // Nếu chưa có relayMap trong draft -> generate tuần tự dựa theo danh sách hiện có
  const relayRows = useMemo(
    () =>
      Array.isArray(draft.relayMap) && draft.relayMap.length
        ? draft.relayMap
        : seqRelayRows(relayTotal),
    [draft.relayMap, relayTotal, seqRelayRows]
  );

  const relayOptions = useMemo(
    () => [{ value: 0, label: t("None") }, ...Array.from({ length: relayTotal }, (_, i) => ({ value: i + 1, label: `#${i + 1}` }))],
    [relayTotal, t]
  );

  const setRelayRow = (idx, patch) => {
    setDraft((d) => {
      const rows = Array.isArray(d.relayMap) && d.relayMap.length ? d.relayMap : seqRelayRows(relayTotal);
      const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return { ...d, relayMap: next };
    });
  };
  const resetRelayMapByApiOrder = async () => {
  try {
    setBusy(true);
    setMsg("");

    // nếu chưa có apiDevices thì nạp một lần từ API
    let rows = apiDevices;
    if (!rows.length) {
      const list = await apiFetch("/api/devices", {}, apiBase);
      const arr = Array.isArray(list) ? list : [];
      arr.sort((a, b) => {
        const an = String(a?.name || "");
        const bn = String(b?.name || "");
        const ai = String(a?.deviceId || "");
        const bi = String(b?.deviceId || "");
        const byName = an.localeCompare(bn, undefined, { sensitivity: "base" });
        return byName !== 0 ? byName : ai.localeCompare(bi);
      });
      rows = arr.map((d) => ({
        id: String(d.deviceId),
        name: d.name || d.deviceId,
        relay: Number(d.relay || 0),
      }));
      setApiDevices(rows);
    }

    // sort theo giá trị relay từ API (tăng dần), rồi name, rồi id
    const sorted = [...rows].sort((a, b) => {
      const ar = Number(a.relay || 0);
      const br = Number(b.relay || 0);
      if (ar !== br) return ar - br;
      const byName = String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
      if (byName !== 0) return byName;
      return String(a.id).localeCompare(String(b.id));
    });

    // đánh số lại 1..relayTotal theo thứ tự đã sort (dư -> 0)
    const renumbered = sorted.map((r, idx) => ({
      ...r,
      relay: idx < relayTotal ? idx + 1 : 0,
    }));

    setDraft((d) => ({ ...d, relayMap: renumbered }));
    setMsg(t("Mapping reset by API relay order"));
  } catch (e) {
    setMsg(e.message || "Reset mapping failed");
  } finally {
    setBusy(false);
    setTimeout(() => setMsg(""), 2000);
  }
};
  const setRelayTotal = (n) => setDraft((d) => ({ ...d, relayTotal: n }));
  const resetRelayMap = () =>
    setDraft((d) => ({
      ...d,
      relayMap: seqRelayRows(Number(d.relayTotal ?? 16)),
    }));

  // phát hiện duplicate relay (bỏ qua 0)
  const dupRelaySet = useMemo(() => {
    const used = relayRows.map((r) => r.relay).filter((n) => Number(n) > 0);
    const dups = new Set();
    used.forEach((n, _, arr) => {
      if (arr.filter((x) => x === n).length > 1) dups.add(n);
    });
    return dups;
  }, [relayRows]);

  /* ---------- Relays API actions ---------- */
  const saveRelayMapping = async () => {
    try {
      setBusy(true);
      setMsg("");
      const payload = relayRows.map((r) => ({ deviceId: r.id, relay: Number(r.relay || 0) }));
      await apiFetch("/api/devices/mapping", { method: "PUT", body: { mapping: payload } }, apiBase);
      setMsg(t("Mapping saved successfully"));
    } catch (e) {
      console.error("[settings/relays] save error:", e);
      setMsg(e.message || "Save mapping failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const loadRelayMapping = async () => {
    try {
      setBusy(true);
      setMsg("");
      const data = await apiFetch("/api/devices/mapping", {}, apiBase);
      // data: [{deviceId, relay}, ...]
      const byId = Object.fromEntries(
        (Array.isArray(data) ? data : []).map((m) => [String(m.deviceId), Number(m.relay || 0)])
      );
      // Gắn theo danh sách thiết bị đang có (ưu tiên apiDevices để giữ sort)
      const source = apiDevices.length ? apiDevices : relayRows;
      const next = source.map((row) => ({
        ...row,
        relay: byId[row.id] ?? 0,
      }));
      setDraft((d) => ({ ...d, relayMap: next }));
      setMsg(t("Loaded mapping from device"));
    } catch (e) {
      console.error("[settings/relays] load error:", e);
      setMsg(e.message || "Load mapping failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <div className="w-full px-4 pt-2 pb-4">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-10 bg-blue-50/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 pb-2 pt-2">
        <div className="text-center">
          <Divider label={t("Settings")} />
        </div>

        {/* Tabs */}
        <div className="mt-2 flex flex-wrap items-center gap-2 justify-center">
          {[
            { id: "general", label: t("General") },
            { id: "relays", label: t("Relays") },
            { id: "alarms", label: t("Alarms & Timers") },
            { id: "api", label: t("Data & API") },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={[
                "px-4 py-2 rounded-xl border text-sm md:text-base",
                tab === tb.id
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-slate-300 text-slate-600 hover:bg-white",
              ].join(" ")}
            >
              {tb.label}
            </button>
          ))}

          {/* Actions (luôn hiển thị trên header) */}
          <div className="ml-auto flex items-center gap-2 pr-1">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-white"
            >
              {t("Back")}
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
            >
              {t("Save")}
            </button>
            {saved && <span className="text-emerald-600">{t("Saved!")}</span>}
          </div>
        </div>
      </div>

      {/* Scroll area */}
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-12 gap-6 mt-4">
          <div className="col-span-12 lg:col-span-10 xl:col-span-8 space-y-6">
            {/* ===== GENERAL ===== */}
            {tab === "general" && (
              <Card title={t("General")}>
                <Row label={t("Language")}>
                  <select
                    value={draft.language || "en"}
                    onChange={(e) => onChange("language", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="en">English</option>
                    <option value="vi">Tiếng Việt</option>
                  </select>
                </Row>

                <Row label={t("Time format")}>
                  <div className="flex gap-3">
                    <label
                      className={`px-4 py-2 rounded-xl border ${
                        draft.timeFormat === "24h"
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        className="mr-2"
                        checked={draft.timeFormat === "24h"}
                        onChange={() => onChange("timeFormat", "24h")}
                      />
                      24h
                    </label>
                    <label
                      className={`px-4 py-2 rounded-xl border ${
                        draft.timeFormat === "12h"
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        className="mr-2"
                        checked={draft.timeFormat === "12h"}
                        onChange={() => onChange("timeFormat", "12h")}
                      />
                      12h
                    </label>
                  </div>
                </Row>

                <Row label={t("Start in Fullscreen")}>
                  <Toggle
                    checked={!!draft.fullscreenOnStart}
                    onChange={(v) => onChange("fullscreenOnStart", v)}
                  />
                </Row>

                <Row label={t("Default page")}>
                  <select
                    value={draft.defaultRoute || "/lighting"}
                    onChange={(e) => onChange("defaultRoute", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="/lighting">Lighting</option>
                    <option value="/ventilation">Ventilation</option>
                    <option value="/control">Controls</option>
                    <option value="/power">Power</option>
                    <option value="/medical-gas">Gas</option>
                    <option value="/history">History</option>
                    <option value="/temperature">Temperature</option>
                    <option value="/humidity">Humidity</option>
                    <option value="/timer">Timer</option>
                    <option value="/settings">Settings</option>
                  </select>
                </Row>
              </Card>
            )}

            {/* ===== RELAYS ===== */}
            {tab === "relays" && (
              <>
                <Card title={t("Relays")}>
                  <Row label={t("Total relays")}>
                    <input
                      type="number"
                      min={1}
                      max={64}
                      value={relayTotal}
                      onChange={(e) =>
                        setRelayTotal(
                          Math.max(1, Math.min(64, Number(e.target.value) || 1))
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                    />
                  </Row>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={fetchAllDevices}
                      className="px-3 py-1.5 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white"
                      disabled={devLoading}
                    >
                      {devLoading ? t("Loading devices...") : t("Reload devices from API")}
                    </button>
                    {!!devErr && <span className="text-rose-600 text-sm">{devErr}</span>}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="py-2 pr-3">{t("Device")}</th>
                          <th className="py-2 pr-3">{t("Relay")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {relayRows.map((row, idx) => {
                          const isDup = row.relay > 0 && dupRelaySet.has(row.relay);
                          return (
                            <tr key={row.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) =>
                                    setRelayRow(idx, { name: e.target.value })
                                  }
                                  className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <select
                                  value={row.relay || 0}
                                  onChange={(e) =>
                                    setRelayRow(idx, {
                                      relay: Number(e.target.value),
                                    })
                                  }
                                  className={[
                                    "w-full rounded-xl border px-3 py-2 bg-white",
                                    isDup ? "border-rose-400" : "border-slate-300",
                                  ].join(" ")}
                                >
                                  {relayOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                {isDup && (
                                  <div className="text-rose-600 text-xs mt-1">
                                    {t("Duplicate relay number")}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                      onClick={resetRelayMapByApiOrder}
                      className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white"
                    >
                      {t("Reset mapping")}
                    </button>
                    <button
                      onClick={loadRelayMapping}
                      disabled={busy}
                      className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                    >
                      {t("Load current mapping")}
                    </button>
                    <button
                      onClick={saveRelayMapping}
                      disabled={busy || dupRelaySet.size > 0}
                      className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      title={dupRelaySet.size > 0 ? t("Fix duplicates first") : ""}
                    >
                      {t("Save mapping to device")}
                    </button>
                    {!!msg && <span className="text-slate-600">{msg}</span>}
                  </div>
                </Card>
              </>
            )}

            {/* ===== ALARMS & TIMERS ===== */}
            {tab === "alarms" && (
              <Card title={t("Alarms & Timers")}>
                <Row label={t("Alarm blink speed (ms)")}>
                  <input
                    type="number"
                    min={200}
                    step={100}
                    value={draft.alarmBlinkMs ?? 1000}
                    onChange={(e) => onChange("alarmBlinkMs", Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </Row>
                <Row label={t("Alarm sound")}>
                  <Toggle
                    checked={!!draft.alarmSound}
                    onChange={(v) => onChange("alarmSound", v)}
                  />
                </Row>
                <Row label={t("T/H poll interval (sec)")}>
                  <input
                    type="number"
                    min={5}
                    step={1}
                    value={draft.pollIntervalSec ?? 10}
                    onChange={(e) =>
                      onChange("pollIntervalSec", Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  />
                </Row>
              </Card>
            )}

            {/* ===== DATA & API ===== */}
            {tab === "api" && (
              <Card title={t("Data & API")}>
                <Row label={t("API base URL")}>
                  <input
                    type="text"
                    value={draft.apiBaseUrl || "http://localhost:5000"}
                    onChange={(e) => onChange("apiBaseUrl", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                    placeholder="http://localhost:5000"
                  />
                </Row>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={onSave}
                    className="px-6 py-3 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-white"
                  >
                    {t("Save")}
                  </button>
                  <button
                    onClick={onReset}
                    className="px-6 py-3 rounded-2xl border-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    {t("Reset to defaults")}
                  </button>
                  {saved && (
                    <span className="ml-2 text-emerald-600">{t("Saved!")}</span>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
