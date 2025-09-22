const express = require('express');
const router = express.Router();
const gasController = require('../controllers/gasController');

router.get('/', gasController.getAllGas);
router.get('/status/:id', gasController.getStatusGas);
router.post('/', gasController.createGas);

module.exports = router;