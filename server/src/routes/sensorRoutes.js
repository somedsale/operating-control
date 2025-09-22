const express = require('express');
const router = express.Router();
const tempController = require('../controllers/tempController');

router.get('/temp', tempController.getTemperature);
router.get('/humidity', tempController.getHumidity);



module.exports = router;