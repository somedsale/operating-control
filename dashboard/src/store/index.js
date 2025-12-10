import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // -> localStorage

// --- reducers của bạn ---
import counterReducer from "./counterSlice";
import languageReducer from "./languageSlice";
import timerReducer from "./timerSlice";
import activeReducer from "./activeSlice";
import dataReducer from "../features/api/apiSlice";      // KHÔNG persist (RTK Query/cache)
import websocketReducer from "./websocketSlice";         // KHÔNG persist (trạng thái kết nối)
import settingsReducer from "./settingsSlice";           // NÊN persist (apiBaseUrl, theme…)
import liveReducer from "../features/live/liveSlice";    // KHÔNG persist (live/volatile)
import statusReducer from "../features/status/statusSlice"; // KHÔNG persist (trạng thái runtime)

// Gộp reducer gốc
const rootReducer = combineReducers({
  counter: counterReducer,
  language: languageReducer,
  timer: timerReducer,
  active: activeReducer,
  data: dataReducer,
  websocket: websocketReducer,
  settings: settingsReducer,
  live: liveReducer,
  status: statusReducer,
});

// Cấu hình persist: chỉ lưu những slice cần thiết
const persistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: [
    "settings",   // apiBaseUrl, theme, locale…
    "language",   // ngôn ngữ
    "active",     // tab/selection nhẹ nhàng (tuỳ bạn)
    // "timer",    // nếu muốn khôi phục cấu hình timer, bật lên
    // "counter",  // demo counter nếu cần
  ],
  // blacklist: ["data", "websocket", "live", "status"], // không cần vì mặc định đã không whitelist
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Tạo store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        // bỏ qua action đặc biệt của redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
    // .concat(lightingApi.middleware) // nếu bạn có RTK Query slice tên lightingApi
});

// Persistor cho PersistGate
export const persistor = persistStore(store);

// (tuỳ chọn) type helpers nếu bạn dùng TS:
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
