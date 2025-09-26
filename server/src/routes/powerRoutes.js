// server/src/routes/powerRoutes.js
const express = require('express');
const router = express.Router();
const powerCtrl = require('../controllers/powerController');

router.get('/', powerCtrl.list);
router.get('/:key', powerCtrl.getOne);
router.put('/:key/status', powerCtrl.setStatus);
router.put('/', powerCtrl.bulkSet);

module.exports = router;
