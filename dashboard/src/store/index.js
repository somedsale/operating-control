import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./counterSlice";
import languageReducer from "./languageSlice";
import timerReducer from "./timerSlice";
import activeReducer from "./activeSlice";
import dataReducer from "../features/api/apiSlice";
import websocketReducer from "./websocketSlice";
import settingsReducer from "./settingsSlice";
export const store = configureStore({
  reducer: {
    counter: counterReducer,
    language: languageReducer,
    timer: timerReducer,
    active: activeReducer,
    data: dataReducer,
    websocket: websocketReducer,
    settings: settingsReducer,
  },
  // middleware: (getDefaultMiddleware) =>
  //   getDefaultMiddleware().concat(lightingApi.middleware),
});
