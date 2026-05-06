const express = require('express');
const router = express.Router();
const { procesarPago } = require('../controllers/pagoController');

router.post('/procesar-pago', procesarPago);

module.exports = router;
