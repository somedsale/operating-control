// src/components/Charts/PressureChart.jsx
import React from "react";
import TemperatureChart from "./TemperatureChart";

/**
 * PressureChart: tái sử dụng TemperatureChart (cùng định dạng data).
 * Nhận props: { data, title, unit, min, max }
 */
export default function PressureChart(props) {
  return <TemperatureChart {...props} />;
}
