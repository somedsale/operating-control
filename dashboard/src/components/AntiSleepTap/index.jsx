// src/components/AntiSleepTap.jsx
import { useEffect, useRef } from "react";

/** Tự click vào một nút vô hình 1x1px ở góc phải trên mỗi 15s */
export default function AntiSleepTap({ intervalMs = 15000 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // click synth + chút mousemove để “đánh thức” rendering path
    const poke = () => {
      if (document.hidden) return;              // chỉ khi tab đang hiện
      if (!document.hasFocus?.() ) return;      // và cửa sổ có focus

      // Di chuyển chuột ảo một tí quanh toạ độ của nút
      const rect = el.getBoundingClientRect();
      const x = rect.left + 0.5, y = rect.top + 0.5;

      ["mousemove", "mousedown", "mouseup", "click"].forEach((type) => {
        const evt = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          view: window,
        });
        el.dispatchEvent(evt);
      });
    };

    // Ưu tiên dùng Wake Lock nếu có (giữ màn hình không sleep)
    let wakeLock;
    const tryWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && navigator.wakeLock.request) {
          wakeLock = await navigator.wakeLock.request("screen");
          // nếu bị mất (minimize / lock), yêu cầu lại
          wakeLock.addEventListener?.("release", () => {
            // no-op; ta vẫn có interval fallback
          });
          document.addEventListener("visibilitychange", async () => {
            if (!document.hidden) {
              try { wakeLock = await navigator.wakeLock.request("screen"); } catch {}
            }
          });
        }
      } catch {
        // fallback: tự click
      }
    };
    tryWakeLock();

    const id = setInterval(poke, Math.max(1000, Number(intervalMs)));
    return () => {
      clearInterval(id);
      if (wakeLock && wakeLock.release) wakeLock.release().catch(() => {});
    };
  }, [intervalMs]);

  return (
    <button
      ref={ref}
      // Cố định ở góc phải trên, vẫn nhận pointer (pointer-events: auto)
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 1,
        height: 1,
        opacity: 0,
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        zIndex: 2147483647, // trên mọi thứ nhưng vô hình
        pointerEvents: "auto",
      }}
      aria-hidden="true"
      tabIndex={-1}
      onClick={() => { /* không làm gì, chỉ để nhận click */ }}
    />
  );
}
