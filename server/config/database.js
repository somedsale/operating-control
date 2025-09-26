// src/config/db.js
const mongoose = require('mongoose');

// Nếu chưa có logger, dùng fallback
let logger;
try { logger = require('../utils/logger'); }
catch { logger = { info: console.log, error: console.error, warn: console.warn }; }

let isConnected = 0; // 0: disconnected, 1: connected

// Tùy chọn mặc định (có thể override qua biến môi trường)
const DEFAULTS = {
  serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 8000),
  maxPoolSize: Number(process.env.MONGO_MAX_POOL || 10),
  autoIndex: true,
};

mongoose.set('strictQuery', true);

// Sự kiện giúp theo dõi trạng thái
mongoose.connection.on('connected', () => logger.info('[mongo] connected'));
mongoose.connection.on('error', (err) => logger.error(`[mongo] error: ${err.message}`));
mongoose.connection.on('disconnected', () => logger.warn('[mongo] disconnected'));

const connect = async (uri = `${process.env.MONGO_URI}/${process.env.MONGODB_DB}`) => {
  if (!uri) {
    logger.error('[mongo] MONGO_URI is missing.');
    process.exit(1);
  }

  // Tránh connect lặp khi hot-reload / nodemon
  if (isConnected === 1) {
    logger.info('[mongo] reuse existing connection');
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, DEFAULTS);
    isConnected = mongoose.connection.readyState; // 1 if connected
    logger.info(`[mongo] db: ${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (error) {
    logger.error(`[mongo] connection error: ${error.message}`);
    process.exit(1);
  }
};

const disconnect = async () => {
  if (isConnected !== 1) return;
  await mongoose.disconnect();
  isConnected = 0;
  logger.info('[mongo] disconnected gracefully');
};

// Đóng kết nối khi app tắt
process.on('SIGINT', async () => { await disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await disconnect(); process.exit(0); });

module.exports = { connect, disconnect };
