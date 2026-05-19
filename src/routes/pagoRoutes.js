const express = require('express');
const router = express.Router();
const { procesarPago } = require('../controllers/pagoController');

router.post('/pay', procesarPago);

module.exports = router;
