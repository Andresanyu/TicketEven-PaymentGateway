const axios = require('axios');

const ADDR = process.env.ADDR || 'localhost';
const PORT_VISA = process.env.PORT_VISA || '3001';
const PORT_MASTER = process.env.PORT_MASTER || '3000';

const URLS_PASARELA = {
  '4': `http://${ADDR}:${PORT_VISA}/api/v1/visa/validar`,
  '5': `http://${ADDR}:${PORT_MASTER}/api/v1/mastercard/validar`,
};

function validarTarjeta(tarjeta) {
  if (!tarjeta || tarjeta.numero === undefined || tarjeta.numero === null || !tarjeta.cvc || !tarjeta.fechaExpiracion)
    return 'Datos de tarjeta insuficientes';

  if (typeof tarjeta.numero !== 'number' && typeof tarjeta.numero !== 'string')
    return 'Número de tarjeta inválido';

  if (String(tarjeta.numero).length !== 16)
    return 'Número de tarjeta inválido';

  return null;
}

function obtenerUrlPasarela(numero) {
  const prefijo = String(numero)[0];
  return URLS_PASARELA[prefijo] || null;
}

exports.procesarPago = async (req, res) => {
  try {
    const { tarjeta } = req.body || {};

    const errorValidacion = validarTarjeta(tarjeta);
    if (errorValidacion)
      return res.status(400).json({ error: errorValidacion });

    const url = obtenerUrlPasarela(tarjeta.numero);
    if (!url)
      return res.status(400).json({ error: 'Tarjeta no soportada' });

    const response = await axios.post(url, { tarjeta }, { validateStatus: () => true });
    return res.status(response.status).send(response.data);

  } catch (err) {
    if (err.response)
      return res.status(err.response.status).send(err.response.data);

    return res.status(502).json({ error: err.message || 'Error al procesar el pago' });
  }
};