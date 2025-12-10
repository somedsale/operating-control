// src/components/RightClickGuard.jsx
import { useEffect } from "react";

export default function RightClickGuard({ allowOnInputs = true }) {
  useEffect(() => {
    const handler = (e) => {
      if (allowOnInputs) {
        const el = e.target;
        if (el && (el.closest?.("input, textarea, [contenteditable='true']"))) {
          return; // cho phép mở menu trong input/textarea/contenteditable
        }
      }
      e.preventDefault();
    };

    // Chặn context menu (desktop)
    document.addEventListener("contextmenu", handler, { capture: true });

    // Trên mobile Safari: giữ để mở callout → vô hiệu hoá qua CSS (bên dưới)
    return () => document.removeEventListener("contextmenu", handler, { capture: true });
  }, [allowOnInputs]);

  return null;
}
