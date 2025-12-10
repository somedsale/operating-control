// server/src/app.js
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const timeout = require("connect-timeout");        // ⬅ add
const haltOnTimedout = (req, res, next) => {       // ⬅ add
  if (!req.timedout) return next();
};

// Routes
const sensorRoutes = require("./routes/sensorRoutes");
const powerRoutes = require("./routes/powerRoutes");
const gasRoutes = require("./routes/gasRoutes");
const ventilationRoutes = require("./routes/ventilationRoutes");
const logsRoutes = require("./routes/logs");
const pressureRoutes = require("./routes/pressure");

const deviceController = require("./controllers/deviceController");
const deviceRoutes = require("./routes/deviceRoutes");
const authAdmin = require("./routes/auth.admin");
const licenseRoutes = require("./routes/license.routes");
const rs485Router = require("./routes/rs485");
const aiConfigRoutes = require("./routes/aiConfigRoutes");
const plcRoutes = require("./routes/plc");

const app = express();

/* ---------- App locals để server.js cập nhật readiness ---------- */
app.locals.readiness = {
  dbOk: false,
  diOk: false,
  aiOk: false,
  aiFixedOk: false,
  doOk: false,
  startedAt: new Date().toISOString(),
};

/* -------------------- Middlewares -------------------- */
// Prod: nên whitelist origin cụ thể; nếu serve cùng origin có thể tắt cors
app.use(
  cors({
    origin: (_origin, cb) => cb(null, true),
    credentials: true,
  })
);

// ⬇ cắt request sớm hơn HTTP server để không “treo socket”
app.use(timeout("55s"));      // phải < requestTimeout của HTTP server
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

/* ----------------------- API Routes ---------------------- */
app.use("/api/sensor", sensorRoutes, haltOnTimedout);
app.use("/api/power", powerRoutes, haltOnTimedout);
app.use("/api/gas", gasRoutes, haltOnTimedout);
app.use("/api/ventilation", ventilationRoutes, haltOnTimedout);
app.use("/api/sensor/pressure", pressureRoutes, haltOnTimedout);

app.use("/api/devices", deviceRoutes(deviceController), haltOnTimedout);
app.use("/api/rs485", rs485Router, haltOnTimedout);
app.use("/api/ai-config", aiConfigRoutes, haltOnTimedout);
app.use("/api/logs", logsRoutes, haltOnTimedout);
app.use("/api/plc", plcRoutes, haltOnTimedout);
app.use("/api/pin", require("./routes/pin.routes"), haltOnTimedout);

// Healthz / Readyz
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    service: "express",
    driver: "nodes7",
    time: new Date().toISOString(),
  })
);

// ⬇ readiness dựa trên app.locals (được server.js cập nhật theo trạng thái thực)
app.get("/api/ready", (req, res) => {
  const s = req.app.locals.readiness || {};
  const ready = !!(s.dbOk); // bạn có thể siết chặt: && s.diOk && s.aiOk ...
  if (ready) return res.json({ ready: true, ...s, time: new Date().toISOString() });
  res.status(503).json({ ready: false, ...s, time: new Date().toISOString() });
});

// Seed admin mặc định nếu chưa có
authAdmin.ensureDefaultAdmin?.();

// Auth + license
app.use("/api/auth/admin", authAdmin, haltOnTimedout);
app.use("/api/license", licenseRoutes, haltOnTimedout);

/* ----------------- Serve React build (same origin) ----------------- */
const CLIENT_BUILD =
  process.env.CLIENT_BUILD_DIR ||
  path.join(__dirname, "../../dashboard", process.env.CLIENT_DIST_DIR || "build");

// 1) Static cho root
app.use(express.static(CLIENT_BUILD));
// 2) Static cho /admin
app.use("/admin", express.static(CLIENT_BUILD));

// 3) 404 riêng cho /api
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

// 4) SPA catch-all cho /admin
app.get(/^\/admin(?:\/.*)?$/, (req, res, next) => {
  if (/\.[a-z0-9]+$/i.test(req.path)) return next();
  res.sendFile(path.join(CLIENT_BUILD, "index.html"), (err) => err && next(err));
});

// 5) SPA catch-all chung
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  if (/\.[a-z0-9]+$/i.test(req.path)) return next();
  res.sendFile(path.join(CLIENT_BUILD, "index.html"), (err) => err && next(err));
});

/* ----------------- Error & Fallback ----------------- */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, _req, res, _next) => {
  // Đừng để lỗi JSON parse làm treo
  const status = err.status || err.statusCode || 500;
  console.error("[ERROR]", err);
  res.status(status).json({ error: err.message || "Server error" });
});

module.exports = app;
