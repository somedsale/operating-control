// server/src/routes/rs485Routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rs485Controller');

// GET /api/rs485      -> đọc
router.get('/', ctrl.getRS485);

// PUT /api/rs485      -> ghi (body: {address, baud, parity})
router.put('/', ctrl.setRS485);

module.exports = router;
