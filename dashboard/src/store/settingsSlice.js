// src/store/settingsSlice.js
import { createSlice } from "@reduxjs/toolkit";

const LS_KEY = "app.settings.v2";

// Mặc định đầy đủ các field bạn đang dùng
const defaults = {
  language: "vi",                // 'en' | 'vi'
  timeFormat: "24h",             // '24h' | '12h'
  theme: "light",                // 'light' | 'dark'
  fullscreenOnStart: false,
  defaultRoute: "/lighting",

  apiBaseUrl: process.env.REACT_APP_API_BASE || "http://localhost:5000",

  // Timers / alarms
  pollIntervalSec: 10,           // khoảng polling T/H
  alarmBlinkMs: 1000,
  alarmSound: true,

  // Relays
  relayTotal: 16,                // tổng số relay khả dụng
  relayMap: [],                  // [{ id, name, relay }]
};

// helpers
const clamp = (n, min, max) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
};

function sanitize(input) {
  const s = { ...defaults, ...(input || {}) };

  // language
  if (!["en", "vi"].includes(s.language)) s.language = defaults.language;

  // time format
  if (!["12h", "24h"].includes(s.timeFormat)) s.timeFormat = defaults.timeFormat;

  // theme
  if (!["light", "dark"].includes(s.theme)) s.theme = defaults.theme;

  // booleans
  s.fullscreenOnStart = !!s.fullscreenOnStart;
  s.alarmSound = !!s.alarmSound;

  // numbers
  s.pollIntervalSec = clamp(s.pollIntervalSec, 5, 3600);
  s.alarmBlinkMs    = clamp(s.alarmBlinkMs, 100, 5000);
  s.relayTotal      = clamp(s.relayTotal ?? 16, 1, 64);

  // relayMap chuẩn hoá
  const rows = Array.isArray(s.relayMap) ? s.relayMap : [];
  s.relayMap = rows.map((r) => ({
    id: String(r?.id || ""),
    name: String(r?.name || ""),
    relay: clamp(r?.relay ?? 0, 0, s.relayTotal),
  }));

  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {}
  return { ...defaults };
}

function save(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

const initialState = load();

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    // Cập nhật 1 key
    setSetting: (state, { payload: { key, value } }) => {
      const next = sanitize({ ...state, [key]: value });
      save(next);
      return next; // trả state mới để đảm bảo nhất quán
    },

    // Cập nhật nhiều key 1 lần
    setMany: (state, { payload }) => {
      const next = sanitize({ ...state, ...(payload || {}) });
      save(next);
      return next;
    },

    // Thay thế toàn bộ settings
    replaceSettings: (_, { payload }) => {
      const next = sanitize(payload);
      save(next);
      return next;
    },

    // Reset về mặc định
    resetSettings: () => {
      const next = sanitize(defaults);
      save(next);
      return next;
    },
  },
});

export const { setSetting, setMany, replaceSettings, resetSettings } =
  settingsSlice.actions;

export default settingsSlice.reducer;

// Optional selectors (tiện dùng ở UI)
export const selectSettings = (s) => s.settings;
export const selectTimeFormat =
  (s) => s?.settings?.timeFormat ?? s?.settings?.value?.timeFormat ?? "24h";
