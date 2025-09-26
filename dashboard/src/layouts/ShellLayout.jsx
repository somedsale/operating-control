import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import NavBar from "../components/NavBar";
import Right from "../components/Right";
import Footer from "../components/Footer";
import Time from "../components/Time";

export default function ShellLayout() {
  return (
    // Đặt biến bề rộng 1 lần để dùng lại cho Nav/Right/Footer spacer
    <div
      className="min-h-screen w-full bg-blue-50 text-black"
      style={{
        // NavBar ~ 12rem (192px). Tuỳ bạn chỉnh 10–14rem.
        "--nav-w": "12rem",
        // Right panel 22rem ở md, 26rem ở xl (tuỳ vào Right của bạn)
        "--right-w": "22rem",
        "--right-w-xl": "26rem",
      }}
    >
      <Header />

      {/* Body: md+ chia 3 cột; mobile xếp dọc */}
      <div
        className="
          w-full px-3 md:px-6
          grid grid-cols-1
          md:grid-cols-[var(--nav-w)_minmax(0,1fr)_var(--right-w)]
          xl:grid-cols-[var(--nav-w)_minmax(0,1fr)_var(--right-w-xl)]
          gap-3 md:gap-6 items-start
        "
      >
        {/* Cột trái: NavBar (fill 100% ô cột) */}
        <aside className="hidden md:block w-full mt-6  pt-32">
          <NavBar />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex flex-col">
          <Time />
          <Outlet />
          <Footer />
        </main>

        {/* Cột phải: Right panel */}
        <aside className="hidden md:block w-full mt-6  pt-32">
          <Right />
        </aside>
      </div>
    </div>
  );
}
