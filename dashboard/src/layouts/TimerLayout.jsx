import React from "react";
import { Outlet } from "react-router-dom";

// Layout riêng cho /timer để không ảnh hưởng view khác
export default function TimerLayout() {
  return (
    <div className="relative z-0 min-h-screen w-full bg-blue-50 text-black">
      {/* isolate để tách layer z-index của timer khỏi phần còn lại */}
      <div className="isolate">
        <Outlet />
      </div>
    </div>
  );
}
