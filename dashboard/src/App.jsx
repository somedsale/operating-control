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

import TimerView from "./pages/TimerView";           // trang timer của bạn
import ShellLayout from "./layouts/ShellLayout";     // layout chung
import TimerLayout from "./layouts/TimerLayout";     // layout riêng cho timer
import TemperaturePage from "./pages/Charts/TemperaturePage";
import HumidityPage from "./pages/Charts/HumidityPage";
import SettingsPage from "./pages/Settings";
import GlobalAlarm from "./components/Alarm/GlobalAlarm";

export default function App() {
  return (
    <>
  
    <Routes>
      {/* Trang đứng riêng (không cần Shell) */}
      <Route path="/" element={<Home />} />
      <Route path="/standby" element={<StandBy />} />
<Route path="/settings" element={<SettingsPage />} />

      {/* TIMER: layout riêng, không có Header/Nav/Footer nên không thể đè */}
      <Route element={<TimerLayout />}>
        <Route path="/timer" element={<TimerView />} />
      </Route>

      {/* Các trang còn lại dùng Shell */}
      <Route element={<ShellLayout />}>
        <Route path="/lighting" element={<Lighting />} />
        <Route path="/control" element={<Control />} />
        <Route path="/medical-gas" element={<MedicalGas />} />
        <Route path="/ventilation" element={<Ventilation />} />
        <Route path="/power" element={<Power />} />
        <Route path="/music" element={<Music />} />
        <Route path="/history" element={<History />} />
<Route path="/temperature" element={<TemperaturePage />} />
<Route path="/humidity" element={<HumidityPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
     <GlobalAlarm />
      </>
  );
}
