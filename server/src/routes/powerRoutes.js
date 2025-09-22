const express = require('express');
const router = express.Router();
const powerController = require('../controllers/powerController');

router.get('/', powerController.getAllPower);
router.get('/status/:id', powerController.getStatus);
router.post('/', powerController.createPower);



module.exports = router;