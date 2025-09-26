// src/pages/History/index.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import { fetchDataFailure } from "../../features/api/apiSlice";

const SEVERITY_STYLE = {
  error:   { badge: "bg-rose-100 text-rose-700",   border: "border-rose-300" },
  warning: { badge: "bg-amber-100 text-amber-700", border: "border-amber-300" },
  info:    { badge: "bg-sky-100 text-sky-700",     border: "border-sky-300" },
  default: { badge: "bg-slate-100 text-slate-700", border: "border-slate-300" },
};

const LIMIT = 200; // tối đa bản ghi/lần tải

const ymd = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
};

export default function History() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const apiBase = useSelector(
    (s) => s.settings?.apiBaseUrl || process.env.REACT_APP_API_BASE || "http://localhost:5000"
  );

  // ----- filters -----
  const [source, setSource] = useState("all");     // all|gas|power
  const [severity, setSeverity] = useState("all"); // all|error|warning|info
  const today = useMemo(() => ymd(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // ----- data state -----
  const [items, setItems] = useState([]); // [{id,timestamp,source,subsystem,severity,message,details}]
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const formatDateTime = useCallback(
    (ts) =>
      new Date(ts).toLocaleString(i18n.language, {
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
      }),
    [i18n.language]
  );

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");

      const qs = new URLSearchParams();
      if (source !== "all") qs.set("source", source);
      if (severity !== "all") qs.set("severity", severity);
      if (fromDate) qs.set("from", fromDate);
      if (toDate) qs.set("to", toDate);
      qs.set("limit", String(LIMIT));
      qs.set("offset", "0");

      const url = `${apiBase.replace(/\/+$/, "")}/api/logs?${qs.toString()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || res.statusText);

      const list = Array.isArray(json?.items) ? json.items : [];
      // đảm bảo có timestamp dạng number
      const norm = list
        .map((it) => ({
          ...it,
          timestamp:
            typeof it.timestamp === "number"
              ? it.timestamp
              : Date.parse(it.timestamp),
        }))
        .filter((it) => Number.isFinite(it.timestamp))
        .sort((a, b) => b.timestamp - a.timestamp);

      setItems(norm);
      setTotal(Number(json?.total ?? norm.length));
      setLastUpdate(Date.now());
    } catch (e) {
      const msg = e?.message || "Fetch logs failed";
      setErr(msg);
      dispatch(fetchDataFailure(msg));
    } finally {
      setLoading(false);
    }
  }, [apiBase, source, severity, fromDate, toDate, dispatch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="w-full px-3 md:px-6">
      <div className="w-full text-center capitalize">
        <Divider label={t("history")} />
      </div>

      <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-4 md:p-6">
        {/* Header + filters */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <h2 className="text-[clamp(18px,2.2vw,26px)] font-semibold text-slate-800">
            {t("Error Reporting History")}
          </h2>

          <div className="flex flex-wrap items-end gap-2">
            {/* Source */}
            <label className="text-sm text-slate-600">
              {t("Source")}
              <select
                className="ml-2 border rounded-lg px-2 py-1 bg-white"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="all">{t("All")}</option>
                <option value="gas">Gas</option>
                <option value="power">Power</option>
              </select>
            </label>

            {/* Severity */}
            <label className="text-sm text-slate-600">
              {t("Severity")}
              <select
                className="ml-2 border rounded-lg px-2 py-1 bg-white"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="all">{t("All")}</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </label>

            {/* Date range */}
            <label className="text-sm text-slate-600">
              {t("From")}
              <input
                type="date"
                className="ml-2 border rounded-lg px-2 py-1 bg-white"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("To")}
              <input
                type="date"
                className="ml-2 border rounded-lg px-2 py-1 bg-white"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <button
              onClick={fetchLogs}
              className="ml-1 px-3 py-1.5 border rounded-lg text-sm text-slate-700 hover:bg-gray-50"
            >
              {t("Refresh")}
            </button>
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="text-slate-500">
            {t("Last update")}: {formatDateTime(lastUpdate)}
            {" • "}
            {t("Total")}: <span className="font-medium">{total}</span>
          </div>
          {loading && <div className="text-slate-400">{t("Loading")}…</div>}
        </div>

        {/* Error banner */}
        {!!err && (
          <div className="mb-3 text-sm text-rose-700 bg-rose-50/70 border border-rose-200 rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        {/* List */}
        <div className="max-h-[40vh] overflow-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              {t("No logs to display")}
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((log) => {
                const sev = String(log.severity || "").toLowerCase();
                const styles = SEVERITY_STYLE[sev] || SEVERITY_STYLE.default;
                return (
                  <li
                    key={log.id || `${log.timestamp}-${log.message}-${Math.random()}`}
                    className={`rounded-xl border ${styles.border} bg-white/80 p-4 hover:bg-white transition`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles.badge}`}
                        >
                          {sev.toUpperCase()}
                        </span>
                        {log.source && (
                          <span className="text-xs px-2 py-1 rounded-full border bg-white text-slate-600">
                            {String(log.source).toUpperCase()}
                            {log.subsystem ? ` • ${String(log.subsystem).toUpperCase()}` : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-sm">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-800 leading-relaxed">
                      {log.message}
                    </p>

                    {log.details && (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer text-slate-600 hover:text-slate-800 text-sm">
                          {t("Details")}
                        </summary>
                        <pre className="bg-slate-100 text-slate-800 rounded-md p-3 mt-2 text-xs md:text-sm whitespace-pre-wrap font-mono">
                          {log.details}
                        </pre>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
