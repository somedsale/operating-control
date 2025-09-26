// server/src/routes/sensorRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sensorController');

router.get('/temp', ctrl.getTemperature);       // trả về số
router.get('/humidity', ctrl.getHumidity);      // trả về số
router.get('/last', ctrl.getLast);              // trả về cả 2
router.get('/history', ctrl.getHistory);        // lịch sử (raw/aggregate)
// --- Áp suất lọc / Áp suất phòng ---
router.get('/pressure/filter', ctrl.getFilterPressure);
router.get('/pressure/filter/history', ctrl.getFilterPressureHistory);

router.get('/pressure/room', ctrl.getRoomPressure);
router.get('/pressure/room/history', ctrl.getRoomPressureHistory);
module.exports = router;
