const express = require('express');
const router = express.Router();
const lightingController = require('../controllers/lightingController');

router.get('/', lightingController.getAllLightings);
router.get('/status/:id', lightingController.getStatusLight);
// router.get('/turn-on/:id', lightingController.TurnOn);
// router.get('/turn-off/:id', lightingController.TurnOff);
router.post('/', lightingController.createLighting);
router.put('/change-relay', lightingController.changeRelay);


module.exports = router;