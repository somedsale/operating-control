// server/src/routes/deviceRoutes.js
const express = require('express');

module.exports = (controller) => {
  const router = express.Router();

  // Danh sách thiết bị (kèm hwOn nếu đọc được từ driver)
  router.get('/', controller.getAll);

  // Bật/tắt 1 thiết bị theo deviceId
  router.patch('/:deviceId/state', controller.setState);

  // Cập nhật mapping relay hàng loạt
  router.put('/mapping', controller.updateMapping);

  return router;
};
