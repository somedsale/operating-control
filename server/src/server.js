// server/src/server.js
require("dotenv").config();

const http = require("http");                     // ⬅ dùng http server để set timeout/keepalive
const app = require("./app");
const { port } = require("../config/env");
const { connect } = require("../config/database");

// Services
const { startDiPlcSync, stopDiPlcSync } = require("./services/diPlcSync");
const { startDOSync, stopDOSync } = require("./services/doSync.service");
const {
  startPlcSensor,
  stopPlcSensor,
  startAISyncFixed,
  stopAISyncFixed,
} = require("./services/sensorService");

// Bắt lỗi chưa bắt để không treo âm thầm
process.on("unhandledRejection", (reason, p) => {
  console.error("[unhandledRejection] Promise:", p, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  // Cho PM2/Docker khởi động lại sạch
  process.exit(1);
});

/* ================== BOOTSTRAP ================== */
async function bootstrap() {
  try {
    console.log("========================================");
    console.log(" 🚀 Somed PLC Server starting...");
    console.log("   ENV:", {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DB_URI: process.env.MONGO_URI,
      PLC_IP: process.env.PLC_IP,
      PLC_RACK: process.env.PLC_RACK,
      PLC_SLOT: process.env.PLC_SLOT,
      PLC_POLL_MS: process.env.PLC_POLL_MS,
      DI_POLL_MS: process.env.DI_POLL_MS,
    });
    console.log("========================================");

    // 1) Kết nối DB
    await connect();
    console.log("[DB] connected OK");
    app.locals.readiness.dbOk = true;

    // 2) HTTP server với timeout/keep-alive “đúng chuẩn”
    const listenPort = Number(port || process.env.PORT || 5000);
    const server = http.createServer(app);

    // ⬇ Quan trọng: giảm treo socket/keep-alive mismatch
    server.requestTimeout = 60_000;   // 60s cho một request
    server.keepAliveTimeout = 65_000; // nên > requestTimeout một chút
    server.headersTimeout = 66_000;   // > keepAliveTimeout
    // Nếu có reverse proxy, đảm bảo proxy_read_timeout ~70s

    server.listen(listenPort, async () => {
      console.log(`[HTTP] Server running at http://localhost:${listenPort}`);

      // 3) Start services — có try/catch từng khối & cập nhật readiness
      try {
        await startDiPlcSync();
        app.locals.readiness.diOk = true;
        console.log("[diPlcSync] started");
      } catch (e) {
        app.locals.readiness.diOk = false;
        console.error("[diPlcSync] start error:", e?.message || e);
      }

      try {
        await startPlcSensor();
        app.locals.readiness.aiOk = true;
        console.log("[plcSensor] started");
      } catch (e) {
        app.locals.readiness.aiOk = false;
        console.error("[plcSensor] start error:", e?.message || e);
      }

      try {
        await startAISyncFixed();
        app.locals.readiness.aiFixedOk = true;
        console.log("[AISyncFixed] started");
      } catch (e) {
        app.locals.readiness.aiFixedOk = false;
        console.error("[AISyncFixed] start error:", e?.message || e);
      }

      try {
        await startDOSync();
        app.locals.readiness.doOk = true;
        console.log("[doSync] started");
      } catch (e) {
        app.locals.readiness.doOk = false;
        console.error("[doSync] start error:", e?.message || e);
      }
    });

    // 4) Graceful shutdown: đóng services trước, rồi close HTTP
    const shutdown = () => {
      console.log("\n[Shutdown] stopping services...");
      try { stopDiPlcSync(); app.locals.readiness.diOk = false; console.log("[diPlcSync] stopped"); } catch (_) {}
      try { stopPlcSensor(); app.locals.readiness.aiOk = false; console.log("[plcSensor] stopped"); } catch (_) {}
      try { stopAISyncFixed(); app.locals.readiness.aiFixedOk = false; console.log("[AISyncFixed] stopped"); } catch (_) {}
      try { stopDOSync?.(); app.locals.readiness.doOk = false; console.log("[doSync] stopped"); } catch (_) {}

      server.close(() => {
        console.log("[HTTP] closed");
        process.exit(0);
      });

      // Force exit nếu 5s vẫn chưa thoát
      setTimeout(() => {
        console.warn("[Shutdown] force exit after 5s");
        process.exit(0);
      }, 5000).unref();
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("[Bootstrap] failed:", err?.message || err);
    process.exit(1);
  }
}

bootstrap();
