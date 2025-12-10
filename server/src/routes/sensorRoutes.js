// server/src/routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const sensor = require('../controllers/sensorController');

router.get('/ai/live', sensor.getAiLive);
router.get('/ai/raw', sensor.getAiRaw);          // <-- API đọc AI raw
router.get('/last', sensor.getLast);
router.get('/history', sensor.getHistory);

router.get('/temperature', sensor.getTemperature);
router.get('/humidity', sensor.getHumidity);

router.get('/pressure/filter', sensor.getFilterPressure);
router.get('/pressure/room', sensor.getRoomPressure);
router.get('/pressure/filter/history', sensor.getFilterPressureHistory);
router.get('/pressure/room/history', sensor.getRoomPressureHistory);

module.exports = router;
