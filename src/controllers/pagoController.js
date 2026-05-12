const axios = require('axios');
const { crearTransaccion, actualizarTransaccion } = require('../db/transaccionesRepository');

const ADDR        = process.env.ADDR        || 'localhost';
const PORT_VISA   = process.env.PORT_VISA   || '3001';
const PORT_MASTER = process.env.PORT_MASTER || '3000';

const PASARELAS = {
  '4': {
    url:        `http://${ADDR}:${PORT_VISA}/api/v1/visa/validar`,
    franquicia: 'VISA',
    mapearBody: (tarjeta) => ({ pan_number: tarjeta.numero, cvv2: tarjeta.cvc }),
    fueExitoso: (data)    => data.transaction_status === 'APPROVED',
    codigoRespuesta: (data) => data.auth_code || data.error_code || null,
  },
  '5': {
    url:        `http://${ADDR}:${PORT_MASTER}/api/v1/mastercard/validar`,
    franquicia: 'MASTERCARD',
    mapearBody: (tarjeta) => ({ number: String(tarjeta.numero), cvc: tarjeta.cvc }),
    fueExitoso: (data)    => data.payment_status === 'OK',
    codigoRespuesta: (data) => data.auth_ref || data.reason_code || null,
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

function enmascararTarjeta(numero) {
  return `****${String(numero).slice(-4)}`;
}

exports.procesarPago = async (req, res) => {
  const { tarjeta, id_pedido, monto } = req.body || {};

  // Validaciones previas (sin transacción aún)
  const errorValidacion = validarTarjeta(tarjeta);
  if (errorValidacion)
    return res.status(400).json({ error: errorValidacion });

  const pasarela = obtenerPasarela(tarjeta.numero);
  if (!pasarela)
    return res.status(400).json({ error: 'Tarjeta no soportada' });

  // Crear transacción en PENDIENTE
  const transaccion = await crearTransaccion({
    id_pedido,
    monto,
    franquicia:          pasarela.franquicia,
    tarjeta_enmascarada: enmascararTarjeta(tarjeta.numero),
  });

  try {
    const body     = pasarela.mapearBody(tarjeta);
    const response = await axios.post(pasarela.url, body, { validateStatus: () => true });
    const data     = response.data;

    const estado           = pasarela.fueExitoso(data) ? 'APROBADO' : 'RECHAZADO';
    const codigo_respuesta = pasarela.codigoRespuesta(data);

    await actualizarTransaccion(transaccion.id, { estado, codigo_respuesta });

    return res.status(response.status).send(data);

  } catch (err) {
    // La pasarela no respondió o hubo un error de red
    await actualizarTransaccion(transaccion.id, { estado: 'FALLIDO', codigo_respuesta: null });

    if (err.response)
      return res.status(err.response.status).send(err.response.data);

    return res.status(502).json({ error: err.message || 'Error al procesar el pago' });
  }
};