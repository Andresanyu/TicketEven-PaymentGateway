const axios = require('axios');
const { crearTransaccion, actualizarTransaccion } = require('../db/transaccionesRepository');
const logger = require('../utils/logger');

const ADDR        = process.env.ADDR        || 'localhost';
const PORT_VISA   = process.env.PORT_VISA   || '3001';
const PORT_MASTER = process.env.PORT_MASTER || '3002';

const PASARELAS = {
  VISA: {
    url:        `http://${ADDR}:${PORT_VISA}/api/v1/visa/validar`,
    franquicia: 'VISA',
    mapearBody: (tarjeta) => ({ pan_number: tarjeta.pan_number, cvv2: tarjeta.cvv }),
    fueExitoso: (data)    => data.transaction_status === 'APPROVED',
    codigoRespuesta: (data) => data.auth_code || data.error_code || null,
  },
  MASTERCARD: {
    url:        `http://${ADDR}:${PORT_MASTER}/api/v1/mastercard/validar`,
    franquicia: 'MASTERCARD',
    mapearBody: (tarjeta) => ({ number: String(tarjeta.pan_number), cvc: tarjeta.cvv }),
    fueExitoso: (data)    => data.payment_status === 'OK',
    codigoRespuesta: (data) => data.auth_ref || data.reason_code || null,
  },
};

function validarTarjeta(tarjeta) {
  if (!tarjeta || tarjeta.pan_number === undefined || tarjeta.pan_number === null || !tarjeta.cvv || !tarjeta.franquicia)
    return 'Datos de tarjeta insuficientes';

  if (typeof tarjeta.pan_number !== 'number' && typeof tarjeta.pan_number !== 'string')
    return 'Número de tarjeta inválido';

  if (String(tarjeta.pan_number).length !== 16)
    return 'Número de tarjeta inválido';

  return null;
}

function enmascararTarjeta(pan_number) {
  return `****${String(pan_number).slice(-4)}`;
}

exports.procesarPago = async (req, res) => {
  const { tarjeta, id_pedido, id_reserva, monto } = req.body || {};
  const pedidoId = id_pedido || id_reserva;

  logger.info('\n--- NUEVO INTENTO DE PAGO ---');
  logger.info(`Payload recibido: ${JSON.stringify(req.body, null, 2)}`);

  // Validaciones previas (sin transacción aún)
  const errorValidacion = validarTarjeta(tarjeta);
  if (errorValidacion) {
    logger.info(`Fallo en validación: ${errorValidacion}`);
    return res.status(400).json({ error: errorValidacion });
  }

  const pasarela = PASARELAS[tarjeta.franquicia.toUpperCase()] || null;
  if (!pasarela)
    return res.status(400).json({ error: 'Tarjeta no soportada' });

  // Crear transacción en PENDIENTE
  const transaccion = await crearTransaccion({
    id_pedido: pedidoId,
    monto,
    franquicia: pasarela.franquicia,
    tarjeta_enmascarada: enmascararTarjeta(tarjeta.pan_number),
  });

  try {
    const body     = pasarela.mapearBody(tarjeta);
    const response = await axios.post(pasarela.url, body, { validateStatus: () => true });
    const data     = response.data;

    const estado           = pasarela.fueExitoso(data) ? 'APROBADO' : 'RECHAZADO';
    const codigo_respuesta = pasarela.codigoRespuesta(data);

    await actualizarTransaccion(transaccion.id, { estado, codigo_respuesta });

    if (estado === 'APROBADO') {
      return res.status(200).json({
        status: 'APPROVED',
        auth_code: codigo_respuesta,
        tarjeta_enmascarada: enmascararTarjeta(tarjeta.pan_number)
      });
    } else {
      return res.status(402).json({
        status: 'DECLINED',
        reason: 'Pago rechazado por fondos insuficientes o datos incorrectos',
        tarjeta_enmascarada: enmascararTarjeta(tarjeta.pan_number)
      });
    }

  } catch (err) {
    // La pasarela no respondió o hubo un error de red
    await actualizarTransaccion(transaccion.id, { estado: 'FALLIDO', codigo_respuesta: null });

    logger.error(`[ERROR DE RED] La pasarela ${tarjeta?.franquicia} está caída o no responde. Detalle: ${err.message}`);

    return res.status(503).json({ error: 'Servicio de pasarela de pagos no disponible' });
  }
};