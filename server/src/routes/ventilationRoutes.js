const express = require('express');
const router = express.Router();
const ventilationController = require('../controllers/ventilationController');

router.get('/', ventilationController.getVentilation);
router.get('/status', ventilationController.getStatus);
// router.get('/turn-on', ventilationController.TurnOn);
// router.get('/turn-off', ventilationController.TurnOff);
router.get('/decrease', ventilationController.decreaseVentilation);
router.get('/increase', ventilationController.increaseVentilation);

router.post('/', ventilationController.createVentilation);


module.exports = router;