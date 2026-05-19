const express = require('express');
const router = express.Router();
const { liquidarMasivo, generarReporte } = require('../controllers/tesoreriaController');

router.post('/liquidar-masivo', liquidarMasivo);
router.get('/reporte', generarReporte);

module.exports = router;
