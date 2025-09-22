const express = require('express');
const router = express.Router();
const controlController = require('../controllers/controlController');

router.get('/', controlController.getAllControls);
router.get('/status/:id', controlController.getStatusControl);
// router.get('/turn-on/:id', controlController.TurnOn);
// router.get('/turn-off/:id', controlController.TurnOff);
router.post('/', controlController.createControl);
router.put('/change-relay', controlController.changeRelay);


module.exports = router;