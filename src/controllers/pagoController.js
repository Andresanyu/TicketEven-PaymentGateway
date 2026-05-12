const axios = require('axios');

const ADDR        = process.env.ADDR        || 'localhost';
const PORT_VISA   = process.env.PORT_VISA   || '3001';
const PORT_MASTER = process.env.PORT_MASTER || '3000';

const PASARELAS = {
  '4': {
    url: `http://${ADDR}:${PORT_VISA}/api/v1/visa/validar`,
    mapearBody:    (tarjeta) => ({ pan_number: tarjeta.numero, cvv2: tarjeta.cvc }),
    fueExitoso:    (data)    => data.transaction_status === 'APPROVED',
  },
  '5': {
    url: `http://${ADDR}:${PORT_MASTER}/api/v1/mastercard/validar`,
    mapearBody:    (tarjeta) => ({ number: String(tarjeta.numero), cvc: tarjeta.cvc }),
    fueExitoso:    (data)    => data.payment_status === 'OK',
  },
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

function obtenerPasarela(numero) {
  const prefijo = String(numero)[0];
  return PASARELAS[prefijo] || null;
}

exports.procesarPago = async (req, res) => {
  try {
    const { tarjeta } = req.body || {};

    const errorValidacion = validarTarjeta(tarjeta);
    if (errorValidacion)
      return res.status(400).json({ error: errorValidacion });

    const pasarela = obtenerPasarela(tarjeta.numero);
    if (!pasarela)
      return res.status(400).json({ error: 'Tarjeta no soportada' });

    const body = pasarela.mapearBody(tarjeta);
    const response = await axios.post(pasarela.url, body, { validateStatus: () => true });

    return res.status(response.status).send(response.data);

  } catch (err) {
    if (err.response)
      return res.status(err.response.status).send(err.response.data);

    return res.status(502).json({ error: err.message || 'Error al procesar el pago' });
  }
};