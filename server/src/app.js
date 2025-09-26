// server/src/app.js
const express = require("express");
const cors = require("cors");

const sensorRoutes = require("./routes/sensorRoutes");
const powerRoutes = require("./routes/powerRoutes");
const gasRoutes = require("./routes/gasRoutes");
const ventilationRoutes = require("./routes/ventilationRoutes");
const logsRoutes = require("./routes/logs");
const deviceRoutes = require("./routes/deviceRoutes");
const createDeviceController = require("./controllers/deviceController");
const { createDriver } = require("./services/relayDriver");

const app = express();

// CORS an toàn
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Khởi tạo driver & controller
const driver = createDriver(); // <<< QUAN TRỌNG: phải gọi hàm
const deviceController = createDeviceController(driver);

// Routes
app.use("/api/sensor", sensorRoutes);
app.use("/api/power", powerRoutes);
app.use("/api/gas", gasRoutes);
app.use("/api/ventilation", ventilationRoutes);
app.use("/api/sensor/pressure", require("./routes/pressure"));

// Devices (có /mapping)
app.use("/api/devices", deviceRoutes(deviceController));
app.use("/api/logs", logsRoutes);

app.get("/api/health", (req, res) =>
  res.json({ ok: true, driver: driver?.type || "unknown" })
);

app.get("/", (req, res) => res.send("Welcome to the Express API!"));

// 404 JSON
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Error handler JSON
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;
