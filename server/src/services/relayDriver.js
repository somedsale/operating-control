// src/services/relayDriver.js
const EventEmitter = require("events");

// MOCK driver an toàn để dev
function createMockDriver() {
  const state = new Map(); // relay -> boolean
  const bus = new EventEmitter();

  return {
    async write(relay, isOn) {
      state.set(Number(relay), !!isOn);
      bus.emit("change", { relay: Number(relay), on: !!isOn });
    },
    async read(relay) {
      return !!state.get(Number(relay));
    },
    onChange(cb) { bus.on("change", cb); },
    type: "mock",
  };
}

// (tùy ý) Placeholder cho GPIO / Modbus – NHỚ return object có read/write
function createGpioDriver() {
  const bus = new EventEmitter();
  return {
    async write(relay, isOn) { bus.emit("change", { relay: Number(relay), on: !!isOn }); },
    async read() { return false; },
    onChange(cb) { bus.on("change", cb); },
    type: "gpio",
  };
}
function createModbusDriver() {
  const bus = new EventEmitter();
  return {
    async write(relay, isOn) { bus.emit("change", { relay: Number(relay), on: !!isOn }); },
    async read() { return false; },
    onChange(cb) { bus.on("change", cb); },
    type: "modbus",
  };
}

function createDriver() {
  const type = String(process.env.RELAY_DRIVER || "mock").toLowerCase();
  if (type === "gpio")   return createGpioDriver();
  if (type === "modbus") return createModbusDriver();
  return createMockDriver();
}

module.exports = { createDriver };
