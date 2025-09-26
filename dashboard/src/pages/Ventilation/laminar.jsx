// src/components/LaminarSketch.jsx
import React from "react";

/**
 * LaminarSketch – sơ đồ laminar flow grayscale giống hình mẫu.
 * Props:
 *  - className?: string
 *  - isOn?: boolean  // nếu muốn mũi tên nhấp nhẹ
 */
export default function LaminarSketch({ className = "", isOn = false }) {
  const C = {
    canopy: "#ECECEC",  // mảng lớn trên
    line:   "#BDBDBD",  // đường viền khung
    line2:  "#D6D6D6",
    arrow:  "#8C8C8C",  // mũi tên
    table:  "#E7E7E7",  // bàn
    floor:  "#E9E9E9",  // sàn
    dot:    "#5F5F5F",  // chấm hepa
  };

  return (
    <svg
      viewBox="0 0 900 560"
      className={className || "w-full max-h-[28rem]"}
      preserveAspectRatio="xMidYMid meet"
    >
      <style>{`
        @keyframes drop {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(4px) }
        }
        .arrow-anim { ${isOn ? "animation: drop 1.2s ease-in-out infinite;" : ""} }
      `}</style>

      {/* ====== CANOPY hình thang lớn ====== */}
      <polygon
        points="20,50 880,50 830,170 70,170"
        fill={C.canopy}
      />

      {/* ====== Khung box trong suốt dưới canopy ====== */}
      {/* thành trước */}
      <rect x="140" y="170" width="620" height="120" fill="none" stroke={C.line2}/>
      {/* thành trái & phải kéo về sau */}
      <line x1="140" y1="170" x2="90"  y2="200" stroke={C.line}/>
      <line x1="140" y1="290" x2="90"  y2="260" stroke={C.line}/>
      <line x1="760" y1="170" x2="810" y2="200" stroke={C.line}/>
      <line x1="760" y1="290" x2="810" y2="260" stroke={C.line}/>
      {/* thành sau */}
      <rect x="90" y="200" width="720" height="60" fill="none" stroke={C.line}/>

      {/* dầm treo/đèn (đường mảnh) */}
      <line x1="450" y1="150" x2="450" y2="190" stroke={C.line2} strokeWidth="8"/>
      <rect x="300" y="200" width="300" height="35" fill="none" stroke={C.line2}/>
      <path d="M340 235 v25 h60 v10" fill="none" stroke={C.line2}/>
      <path d="M560 235 v25 h-60 v10" fill="none" stroke={C.line2}/>

      {/* ====== Hai cụm HEPA (đĩa có chấm) ====== */}
      {[
        { cx: 365, cy: 280, r: 42 },
        { cx: 535, cy: 280, r: 48 },
      ].map((p, k) => (
        <g key={k}>
          <circle cx={p.cx} cy={p.cy} r={p.r} fill="#fff" stroke={C.line}/>
          {[...Array(16)].map((_, i) => {
            const a = (i * Math.PI * 2) / 16;
            const R = p.r - 13;
            return (
              <circle
                key={i}
                cx={p.cx + R * Math.cos(a)}
                cy={p.cy + R * Math.sin(a)}
                r="5.2"
                fill={C.dot}
                opacity="0.95"
              />
            );
          })}
          <circle cx={p.cx} cy={p.cy} r="6" fill={C.dot}/>
        </g>
      ))}

      {/* ====== Mũi tên xuống lớn 2 bên ====== */}
      <g className="arrow-anim" fill={C.arrow}>
        {/* trái */}
        <path d="M140 240 h50 l-15 75 h30 l-55 60 -55 -60 h30z" />
        {/* phải */}
        <path d="M760 240 h-50 l15 75 h-30 l55 60 55 -60 h-30z" />
      </g>

      {/* ====== Bàn mổ tối giản ====== */}
      <g fill={C.table}>
        <polygon points="430,320 470,320 480,345 420,345"/>
        <rect x="420" y="350" width="60" height="24"/>
        <rect x="400" y="378" width="100" height="22"/>
        <rect x="430" y="404" width="40" height="20"/>
        <rect x="420" y="428" width="60" height="24"/>
        <polygon points="390,460 510,460 535,505 365,505"/>
      </g>

      {/* ====== Mũi tên cong hồi lưu 2 bên ====== */}
      <g fill={C.arrow} opacity=".9">
        {/* trái */}
        <path d="M115,420
                 c-55,45 -55,73 0,120
                 l0,-45 60,0
                 c-40,-20 -57,-38 -60,-75z" />
        {/* phải */}
        <path d="M785,420
                 c55,45 55,73 0,120
                 l0,-45 -60,0
                 c40,-20 57,-38 60,-75z" />
      </g>

      {/* ====== Sàn hình thang ====== */}
      <polygon points="170,460 730,460 840,540 60,540" fill={C.floor}/>
    </svg>
  );
}
