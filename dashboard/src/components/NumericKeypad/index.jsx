import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faDeleteLeft } from "@fortawesome/free-solid-svg-icons";

/**
 * NumericKeypad – reusable virtual keypad (TimeView style)
 *
 * Props:
 * - open: boolean – show/hide modal
 * - initial: number|string – initial value
 * - onApply(valueNumber): function – called with parsed number when Apply
 * - onClose(): function – close modal
 * - t: (k:string)=>string – i18n translate function
 * - title: string – heading text (e.g. "Enter minutes", "Enter address")
 * - unit: string – small label after value (e.g. "min", "value")
 * - integer: boolean – if true, only integers; no dot/comma keys
 * - min, max: number | undefined – clamp output inside [min, max] if provided
 * - show00: boolean – whether to show "00" key (default true)
 * - decimalSeparators: string[] – allowed decimal sep keys (default [".", ","])
 * - applyLabel: string – button text (default t("Apply"))
 * - hint: string – extra helper text under value (e.g. "Allowed: 1…255")
 */
export default function NumericKeypad({
  open,
  initial,
  onApply,
  onClose,
  t = (s) => s,
  title = "",
  unit = "",
  integer = false,
  min,
  max,
  show00 = true,
  decimalSeparators = [".", ","],
  applyLabel,
  hint,
}) {
  const [val, setVal] = useState(String(initial ?? ""));

  useEffect(() => {
    setVal(String(initial ?? ""));
  }, [initial, open]);

  const styles = {
    kbdBtn:
      "text-[clamp(16px,3.2vw,22px)] font-semibold h-14 rounded-xl border border-gray-300 bg-white/70 hover:bg-white active:scale-[0.98]",
  };

  const hasSep = (v) => v.includes(".") || v.includes(",");
  const normalize = (v) => v.replace(",", ".");

  const clampNum = (n) => {
    let out = n;
    if (typeof min === "number") out = Math.max(min, out);
    if (typeof max === "number") out = Math.min(max, out);
    return out;
  };

  const push = (d) =>
    setVal((v) =>
      (v === "0" ? String(d) : v + String(d)).replace(/^0+(?=\d)/, "")
    );

  const push00 = () =>
    setVal((v) => ((v === "" ? "0" : v) + "00").replace(/^0+(?=\d)/, ""));

  const pushDecimal = (sep) =>
    setVal((v) =>
      integer
        ? v
        : v === ""
        ? "0" + sep
        : hasSep(v)
        ? v
        : v + sep
    );

  const back = () => setVal((v) => v.slice(0, -1));
  const clear = () => setVal("");

  const apply = () => {
    const raw = integer ? (val || "0") : normalize(val || "0");
    const parsed = integer ? parseInt(raw, 10) : Number(raw);
    const num = Number.isFinite(parsed) ? parsed : 0;
    const clamped = clampNum(num);
    onApply(clamped);
    onClose();
  };

  if (!open) return null;

  // build keypad rows
  const baseKeys = ["1","2","3","4","5","6","7","8","9"];
  const bottomRow = [];
  if (!integer) bottomRow.push(...decimalSeparators);
  if (show00) bottomRow.push("00");
  bottomRow.push("0");

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[min(92vw,420px)] p-4">
        <div className="mb-3 text-center">
          {title && <div className="text-sm text-gray-500">{title}</div>}
          <div className="mt-1 text-[clamp(28px,6vw,40px)] font-semibold text-gray-800">
            {val || "0"}{" "}
            {unit && (
              <span className="text-gray-400 text-[clamp(16px,3.2vw,18px)]">
                {unit}
              </span>
            )}
          </div>
          {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {baseKeys.map((k) => (
            <button key={k} className={styles.kbdBtn} onClick={() => push(k)}>
              {k}
            </button>
          ))}

          {bottomRow.map((k) => {
            const onTap =
              k === "00"
                ? push00
                : decimalSeparators.includes(k)
                ? () => pushDecimal(k)
                : () => push(k);
            return (
              <button key={k} className={styles.kbdBtn} onClick={onTap}>
                {k}
              </button>
            );
          })}

          <button className={styles.kbdBtn} onClick={clear}>
            {t("Clear")}
          </button>
          <button
            className={styles.kbdBtn}
            onClick={back}
            aria-label={t("Delete")}
            title={t("Delete")}
          >
            <FontAwesomeIcon icon={faDeleteLeft} />
          </button>
          <button
            className={`${styles.kbdBtn} col-span-2 bg-emerald-600 border-emerald-600  flex items-center justify-center gap-2 px-4`}
            onClick={apply}
          >
            <FontAwesomeIcon icon={faCheck} />
            <span>{applyLabel || t("Apply")}</span>
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            className="text-gray-500 hover:text-gray-700 text-sm"
            onClick={onClose}
          >
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
