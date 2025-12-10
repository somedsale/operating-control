// src/App.jsx
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Control from "./pages/Control";
import NotFound from "./pages/NotFound";
import MedicalGas from "./pages/MedicalGas";
import Ventilation from "./pages/Ventilation";
import Lighting from "./pages/Lighting";
import Power from "./pages/Power";
import StandBy from "./pages/StandBy";
import Music from "./pages/Music";
import History from "./pages/History";

import TimerView from "./pages/TimerView";
import ShellLayout from "./layouts/ShellLayout";
import TimerLayout from "./layouts/TimerLayout";
import TemperaturePage from "./pages/Charts/TemperaturePage";
import HumidityPage from "./pages/Charts/HumidityPage";
import SettingsPage from "./pages/Settings";
import GlobalAlarm from "./components/Alarm/GlobalAlarm";
import LicenseGate from "./components/License/LicenseGate";
import AntiSleepTap from "./components/AntiSleepTap";
import RightClickGuard from "./components/RightClickGuard";
import AdminLicenseSettings from "./pages/AdminLicenseSettings";
import FilterPressurePage from "./pages/Charts/FilterPressure";
import RoomPressurePage from "./pages/Charts/RoomPressure";
import PlcConnectionBanner from "./components/PlcConnectionBanner";

// ⬇️ Thêm
import SettingsPinGate from "./components/SettingsPinGate";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

// ⬇️ Thêm banner heartbeat API
import ApiHeartbeatBanner from "./components/ApiHeartbeatBanner"; // ⬅

export default function App() {
  const { t, i18n } = useTranslation();
  const settings = useSelector((s) => s.settings);
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    i18n.changeLanguage(draft.language || "vi");
  }, [draft.language, i18n]);

  return (
    <>
      <LicenseGate>
        <Routes>
          {/* Trang đứng riêng */}
          <Route path="/" element={<Home />} />
          <Route path="/standby" element={<StandBy />} />
          {/* ⬇️ Bọc Settings bằng SettingsPinGate */}
          <Route
            path="/settings"
            element={
              <SettingsPinGate>
                <SettingsPage />
              </SettingsPinGate>
            }
          />
          <Route path="/admin/license" element={<AdminLicenseSettings />} />

          {/* TIMER */}
          <Route element={<TimerLayout />}>
            <Route path="/timer" element={<TimerView />} />
          </Route>

          {/* Shell */}
          <Route element={<ShellLayout />}>
            <Route path="/lighting" element={<Lighting />} />
            <Route path="/control" element={<Control />} />
            <Route path="/medical-gas" element={<MedicalGas />} />
            {/* <Route path="/ventilation" element={<Ventilation />} /> */}
            <Route path="/power" element={<Power />} />
            <Route path="/music" element={<Music />} />
            <Route path="/history" element={<History />} />
            <Route path="/temperature" element={<TemperaturePage />} />
            <Route path="/humidity" element={<HumidityPage />} />
            <Route path="/pressure/filter" element={<FilterPressurePage />} />
            <Route path="/pressure/room" element={<RoomPressurePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        <GlobalAlarm />
        <AntiSleepTap intervalMs={15000} />
        <RightClickGuard allowOnInputs={true} />
        {/* <PlcConnectionBanner /> */}

        {/* ⬇️ Banner heartbeat API */}
        <ApiHeartbeatBanner intervalMs={10_000} /> {/* ⬅ */}
      </LicenseGate>
    </>
  );
}