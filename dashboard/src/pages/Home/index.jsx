// src/pages/Home/index.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setActive } from "../../store/activeSlice";
import logo from "../../assets/img/LogoMes.png";

export default function Home() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const timeFormat = useSelector((s) => s.settings?.timeFormat || "24h");

  // PIN: ưu tiên settings.backPin, fallback biến môi trường
  const configuredPin =
    useSelector((s) => s.settings?.backPin) ||
    process.env.REACT_APP_BACK_PIN ||
    "";

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Helpers (giờ/ngày)
  const pad2 = (n) => String(n).padStart(2, "0");
  const meridiem = (lang, hour) => {
    const isAM = hour < 12;
    return String(lang).toLowerCase().startsWith("vi")
      ? isAM ? "SA" : "CH"
      : isAM ? "AM" : "PM";
  };
  const toHM = (date, fmt = "24h", lang = "en") => {
    const H = date.getHours();
    const M = date.getMinutes();
    if (fmt === "12h") {
      const h12 = H % 12 || 12;
      return { hh: pad2(h12), mm: pad2(M), suffix: meridiem(lang, H) };
    }
    return { hh: pad2(H), mm: pad2(M), suffix: "" };
  };

  const ddmmyyyy = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
  const weekday = now.toLocaleDateString(i18n.language, { weekday: "long" });
  const { hh, mm, suffix } = toHM(now, timeFormat, i18n.language);

  const goControl = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
    } catch {}
    dispatch(setActive("lighting"));
  }, [dispatch]);

  /* ===================== BACK TO WINDOWS (PIN keypad) ===================== */
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [showNumbers, setShowNumbers] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [shake, setShake] = useState(false);
  const [fsError, setFsError] = useState(""); // báo lỗi thoát FS
  const inputRef = useRef(null);
  const dummyFsRef = useRef(null); // div dummy để force-exit

  const openPinModal = () => {
    setPin("");
    setShowNumbers(false);
    setPinErr("");
    setShake(false);
    setShowPinModal(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };
  const closePinModal = () => {
    setShowPinModal(false);
    setPinErr("");
    setShake(false);
  };

  const backToWindows = useCallback(() => {
    openPinModal();
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmPin();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePinModal();
    }
  };

  const masked = showNumbers ? pin : "•".repeat(pin.length);
  const pushDigit = (d) => setPin((v) => (v + d).slice(0, 12));
  const popDigit = () => setPin((v) => v.slice(0, -1));
  const clearPin = () => setPin("");

  const invalidShake = (msg) => {
    setPinErr(msg || t("Incorrect PIN"));
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isFullscreen = () =>
    !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

  // Thoát fullscreen chuẩn + an toàn
  const exitFullscreenOnce = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    } catch (e) {
      throw e;
    }
  };

  const safeExitFullscreen = async () => {
    setFsError("");
    try {
      // đóng modal & blur input để trả focus
      try { document.activeElement?.blur(); } catch {}
      await new Promise((r) => requestAnimationFrame(r));

      // đảm bảo focus vào tab
      if (!document.hasFocus() || document.visibilityState !== "visible") {
        window.focus?.();
        await sleep(60);
      }

      // Nếu chưa ở fullscreen -> xong
      if (!isFullscreen()) return true;

      // Thử thoát trực tiếp
      try {
        await exitFullscreenOnce();
        await sleep(60);
        if (!isFullscreen()) return true;
      } catch {}

      // Không thoát được: dùng mẹo “Force Exit”
      // 1) yêu cầu fullscreen lên một div dummy (chắc chắn có quyền)
      try {
        const el = dummyFsRef.current || document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      } catch {}

      // 2) sau khi đã giành quyền, gọi exit lại
      await sleep(60);
      await exitFullscreenOnce();
      await sleep(60);

      if (!isFullscreen()) return true;

      // Nếu vẫn kẹt:
      throw new Error("Failed to exit fullscreen");
    } catch (e) {
      setFsError(
        t("Could not exit fullscreen automatically. Press F11 (or Fn+F11) to exit, or click Force Exit.")
      );
      return false;
    }
  };

  // Nút Force Exit hiển thị khi gặp lỗi
  const handleForceExit = async () => {
    setFsError("");
    try {
      const el = dummyFsRef.current || document.documentElement;
      // vào fullscreen
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      await sleep(80);
      // thoát fullscreen
      await exitFullscreenOnce();
      await sleep(80);
      if (!isFullscreen()) {
        setFsError("");
      } else {
        setFsError(t("Still in fullscreen. Try pressing F11."));
      }
    } catch (e) {
      setFsError(t("Still in fullscreen. Try pressing F11."));
    }
  };

  const confirmPin = async () => {
    if (configuredPin) {
      if (pin === String(configuredPin)) {
        closePinModal();
        await safeExitFullscreen();
        return;
      }
      invalidShake(t("Incorrect PIN"));
      return;
    }
    // Chưa cấu hình PIN: yêu cầu ít nhất 4 số
    if (pin.length >= 4 && /^\d+$/.test(pin)) {
      closePinModal();
      await safeExitFullscreen();
      return;
    }
    invalidShake(t("Please enter at least 4 digits"));
  };

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900">
      <style>{`
        .time-digits{font-variant-numeric:tabular-nums lining-nums}
        @keyframes shake {
          10%,90% { transform: translateX(-1px); }
          20%,80% { transform: translateX(2px); }
          30%,50%,70% { transform: translateX(-4px); }
          40%,60% { transform: translateX(4px); }
        }
      `}</style>

      {/* Hidden dummy element to reclaim FS then exit */}
      <div ref={dummyFsRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0 }} />

      {/* Logo */}
      <img
        src={logo}
        alt="Logo"
        className="absolute top-6 right-6 h-10 md:h-12 object-contain"
      />

      {/* Content */}
      <div className="max-w-[1100px] mx-auto pt-16 md:pt-20 text-center">
        <div className="text-[clamp(18px,3vw,32px)] text-slate-500">
          {weekday} {ddmmyyyy}
        </div>

        <div className="mt-6 time-digits flex items-baseline justify-center gap-4">
          <div className="text-[clamp(84px,18vw,224px)] font-semibold text-gray-400 leading-none">
            {hh}:{mm}
          </div>
          {timeFormat === "12h" && (
            <div className="text-[clamp(18px,3vw,32px)] text-gray-500">{suffix}</div>
          )}
        </div>

        <div className="mx-auto mt-5 h-6 w-[min(92vw,600px)] rounded-full border-b-2 border-gray-300" />

        <div className="mt-8">
          <NavLink to="/lighting" onClick={goControl}>
            <div
              className="inline-flex items-center justify-center 
                         px-16 py-7 rounded-[32px] border-2 border-gray-300 
                         text-slate-700 text-[clamp(18px,2.8vw,28px)] tracking-wide"
            >
              {t("GO TO CONTROL") || "GO TO CONTROL"}
            </div>
          </NavLink>
        </div>


        {/* Cảnh báo khi không thoát fullscreen tự động được */}
        {!!fsError && (
          <div className="mt-5 mx-auto max-w-[720px] bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3">
            <div className="text-sm">{fsError}</div>
            <div className="mt-2">
              <button
                onClick={handleForceExit}
                className="px-4 py-2 rounded-lg border-2 border-amber-500 text-amber-700 hover:bg-amber-50 text-sm font-semibold"
              >
                {t("Force Exit")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== PIN Modal ===== */}
      {showPinModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                          w-[min(92vw,420px)] bg-white rounded-2xl shadow-xl p-5">
            <div className="text-lg font-semibold text-slate-800 text-center">
              {t("Enter PIN")}
            </div>
            <div className="mt-2 text-xs text-slate-500 text-center">
              {configuredPin
                ? t("Please enter the configured PIN to exit fullscreen")
                : t("No PIN is configured. Enter at least 4 digits to proceed")}
            </div>

            {/* PIN display + toggle */}
            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">
                {t("PIN")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={masked}
                  onKeyDown={onKeyDown}
                  readOnly
                  className={`w-full rounded-xl border px-3 py-2 bg-white outline-none 
                    ${pinErr ? "border-rose-400" : "border-slate-300"} 
                    ${shake ? "animate-[shake_0.35s_linear]" : ""}`}
                  aria-label={t("PIN")}
                />
                <button
                  onClick={() => setShowNumbers((v) => !v)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  {showNumbers ? t("Hide") : t("Show")}
                </button>
              </div>
              {!!pinErr && (
                <div className="mt-1 text-xs text-rose-600">{pinErr}</div>
              )}
            </div>

            {/* Keypad */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["1","2","3","4","5","6","7","8","9","0"].map((d) => (
                <button
                  key={d}
                  onClick={() => pushDigit(d)}
                  className="h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-lg font-semibold"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={clearPin}
                className="h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
              >
                {t("Clear")}
              </button>
              <button
                onClick={popDigit}
                className="h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium"
              >
                {t("Delete")}
              </button>
              <button
                onClick={confirmPin}
                className="h-12 rounded-xl border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-sm font-semibold"
              >
                {t("Confirm")}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={closePinModal}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
