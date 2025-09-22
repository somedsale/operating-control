import { useSelector, useDispatch } from "react-redux";
import Header from "./components/Header";
import { useTranslation } from "react-i18next";
import { setLanguage } from "./store/languageSlice";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Control from "./pages/Control";
import NotFound from "./pages/NotFound";
import NavBar from "./components/NavBar";
import Right from "./components/Right";
import MedicalGas from "./pages/MedicalGas";
import Ventilation from "./pages/Ventilation";
import Lighting from "./pages/Lighting";
import Power from "./pages/Power";
import Footer from "./components/Footer";
import StandBy from "./pages/StandBy";
import TimePage from "./pages/TimePage";
import Music from "./pages/Music";
import History from "./pages/History";
import { useEffect, useState } from "react";
import { addMessage, setStatus, setWebSocket } from "./store/websocketSlice";

function App() {
  const { t } = useTranslation();
  return (
    <div className="container-2xl text-black bg-blue-50 h-[100vh]">
      <Routes>
        {/* Route cho Home Page, nằm ngoài Header và NavBar */}
        <Route path="/" element={<Home />} />
        <Route path="/standby" element={<StandBy />} />
        <Route path="/time" element={<TimePage />} />
        {/* Route cho các trang khác, vẫn giữ Header, NavBar, và Right */}
        <Route
          path="*"
          element={
            <>
              <Header />
              <div className="flex w-full px-4">
                <NavBar />
                <Routes>
                  <Route path="/lighting" element={<Lighting />} />
                  <Route path="/control" element={<Control />} />
                  <Route path="/medical-gas" element={<MedicalGas />} />
                  <Route path="/ventilation" element={<Ventilation />} />
                  <Route path="/power" element={<Power />} />
                  <Route path="/music" element={<Music />} />
                  <Route path="/history" element={<History />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Right />
              </div>
              <Footer />
            </>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
