import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/**
 * props:
 *  - data: [{ timestamp:number|Date|string, value:number } | { t, v }]
 *  - title?: string
 *  - unit?: string (default "°C")
 *  - min?: number (optional Y-min)
 *  - max?: number (optional Y-max)
 */
export default function TemperatureChart({ data = [], title, unit = "°C", min, max }) {
  // Chuẩn hoá: timestamp -> number(ms), value -> number
  // Sort tăng dần & dedupe theo cùng 1 giây (tránh nháy)
  const rows = useMemo(() => {
    const norm = (Array.isArray(data) ? data : [])
      .map((d) => {
        const tsRaw = d.timestamp ?? d.t;
        const vRaw = d.value ?? d.v;
        const ts =
          typeof tsRaw === "number"
            ? tsRaw
            : tsRaw instanceof Date
            ? tsRaw.getTime()
            : Date.parse(tsRaw);
        const v = Number(vRaw);
        return { t: ts, v };
      })
      .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.v))
      .sort((a, b) => a.t - b.t);

    // Dedupe by second (ms -> giây)
    const bySec = new Map();
    for (const p of norm) {
      const key = Math.floor(p.t / 1000) * 1000;
      bySec.set(key, p.v);
    }
    return Array.from(bySec.entries()).map(([t, v]) => ({ t, v }));
  }, [data]);

  // Y-domain: dùng min/max nếu truyền vào, hoặc auto + padding
  const yDomain = useMemo(() => {
    if (typeof min === "number" && typeof max === "number") return [min, max];
    if (rows.length === 0) return ["auto", "auto"];
    const vals = rows.map((r) => r.v);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.5, (hi - lo) * 0.1);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [rows, min, max]);

  const fmtTick = (ts) => {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  return (
    <div className="w-full">
      {title && <div className="mb-2 text-slate-600 font-medium">{title}</div>}
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 10, right: 18, left: 6, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtTick}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 12 }}
              width={40}
              label={unit ? { value: unit, angle: -90, position: "insideLeft", offset: 10 } : undefined}
            />
            <Tooltip
              labelFormatter={(ts) =>
                new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
              formatter={(value) => [`${value}${unit}`, ""]}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
