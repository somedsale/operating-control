// src/utils/time.js
export function pad2(n) {
  return String(Math.floor(n)).padStart(2, "0");
}

// format 'HH:MM' + suffix (AM/PM nếu 12h)
export function toHM(date, fmt = "24h") {
  const H = date.getHours();
  const M = date.getMinutes();
  if (fmt === "12h") {
    const h12 = H % 12 || 12;
    const suffix = H < 12 ? "AM" : "PM";
    return { hh: pad2(h12), mm: pad2(M), suffix };
  }
  return { hh: pad2(H), mm: pad2(M), suffix: "" };
}

// format 'HH:MM:SS' + suffix (AM/PM nếu 12h)
export function toHMS(date, fmt = "24h") {
  const H = date.getHours();
  const M = date.getMinutes();
  const S = date.getSeconds();
  if (fmt === "12h") {
    const h12 = H % 12 || 12;
    const suffix = H < 12 ? "AM" : "PM";
    return { hh: pad2(h12), mm: pad2(M), ss: pad2(S), suffix };
  }
  return { hh: pad2(H), mm: pad2(M), ss: pad2(S), suffix: "" };
}
