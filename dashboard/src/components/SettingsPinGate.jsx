// src/components/SettingsPinGate.jsx
import React, { useEffect, useState } from "react";
import { apiJson } from "../utils/api";
import { useTranslation } from "react-i18next";

export default function SettingsPinGate({ children }) {
  const { t } = useTranslation(); // dùng namespace mặc định

  const [ok, setOk] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setOk(false);
    setPin("");
    setErr("");
  }, []);

  async function submit() {
    if (!pin) return;
    setLoading(true);
    setErr("");
    try {
      await apiJson("/api/pin/verify", {
        method: "POST",
        body: { pin },
      });
      setOk(true);
    } catch (e) {
      setErr(e.message || t("pin.error_invalid"));
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  function onAppend(d) {
    if (loading) return;
    setPin((s) => (s.length >= 6 ? s : s + String(d)));
  }
  function onBackspace() {
    if (loading) return;
    setPin((s) => s.slice(0, -1));
  }
  function onClear() {
    if (loading) return;
    setPin("");
    setErr("");
  }

  if (ok) return children;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      aria-live="polite"
      role="dialog"
      aria-label={t("pin.dialog_label")}
      aria-modal="true"
    >
      <div className="w-[360px] max-w-[92vw] rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-xl font-semibold text-center">{t("pin.title")}</h2>
        <p className="mt-1 text-center text-gray-500 text-sm">
          {t("pin.subtitle")}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <code
              className="text-2xl tracking-widest select-none"
              aria-label={t("pin.field_aria")}
            >
              {pin.replace(/./g, "•") || "— — —"}
            </code>
            <button
              type="button"
              onClick={onBackspace}
              disabled={loading || !pin}
              className="rounded-lg px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              aria-label={t("pin.backspace")}
              title={t("pin.backspace")}
            >
              ⌫
            </button>
          </div>
          {err ? (
            <div className="mt-2 text-center text-sm text-red-600" role="alert">
              {err}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 select-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onAppend(k)}
              disabled={loading}
              className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98]"
              aria-label={t("pin.key_n", { n: k })}
              title={t("pin.key_n", { n: k })}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            disabled={loading || !pin}
            className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            aria-label={t("pin.clear")}
            title={t("pin.clear")}
          >
            {t("pin.clear")}
          </button>
          <button
            type="button"
            onClick={() => onAppend(0)}
            disabled={loading}
            className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98]"
            aria-label={t("pin.key_n", { n: 0 })}
            title={t("pin.key_n", { n: 0 })}
          >
            0
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || !pin}
            className="py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            aria-label={t("pin.ok")}
            title={t("pin.ok")}
          >
            {loading ? t("pin.checking") : t("pin.ok")}
          </button>
        </div>

        {/* Optional: hỗ trợ Enter/Backspace từ bàn phím vật lý */}
        <input
          type="password"
          inputMode="numeric"
          className="sr-only"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Backspace") onBackspace();
          }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
