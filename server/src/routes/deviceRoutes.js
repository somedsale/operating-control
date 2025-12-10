// server/src/routes/deviceRoutes.js
const express = require('express');

module.exports = (controller) => {
  const router = express.Router();

  // Danh sách thiết bị (kèm hwOn/isOn, relay, name…)
  router.get('/', controller.getAll);

  // --- Mapping relay (đặt trước các route có :deviceId) ---
  // Lấy mapping gọn nhẹ: [{ deviceId, relay }]
  router.get('/mapping', controller.getMapping);

  // Cập nhật mapping relay hàng loạt
  router.put('/mapping', controller.updateMapping);

  // --- Device state & relay ---
  // Bật/tắt 1 thiết bị theo deviceId
  router.patch('/:deviceId/state', controller.setState);

  // Cập nhật relay cho 1 thiết bị
  router.patch('/:deviceId/relay', controller.setRelay);
  // Đọc trạng thái tất cả relay từ PLC
  router.get('/plc', controller.readPLCStates);

  return router;
};
