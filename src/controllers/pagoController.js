const axios = require('axios');
const { crearTransaccion, actualizarTransaccion, obtenerPorPedido } = require('../db/transaccionesRepository');
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
  const { tarjeta, id_pedido, id_reserva, empresa_id, monto } = req.body || {};
  const pedidoId = id_pedido || id_reserva;

  logger.info('\n--- NUEVO INTENTO DE PAGO ---');
  logger.info(`Payload recibido: ${JSON.stringify(req.body, null, 2)}`);

  // Log si la empresa no es la correcta
  if (empresa_id !== 1001) {
    logger.warn(`[RECHAZADO] Intento de cobro con Comercio no autorizado. ID recibido: ${empresa_id}`);
    return res.status(403).json({ error: 'Empresa no autorizada' });
  }

  if (!pedidoId) {
    logger.warn('[RECHAZADO] Falta id_reserva o id_pedido en el payload');
    return res.status(400).json({ error: 'id_reserva o id_pedido es requerido' });
  }

  if (!monto || monto <= 0) {
    logger.warn(`[RECHAZADO] Intento de cobro con monto inválido: ${monto}`);
    return res.status(400).json({ error: 'El monto de la transacción debe ser mayor a cero' });
  }

  // Validaciones previas de formato de tarjeta
  const errorValidacion = validarTarjeta(tarjeta);
  if (errorValidacion) {
    logger.warn(`[RECHAZADO] Fallo en estructura de tarjeta: ${errorValidacion}`);
    return res.status(400).json({ error: errorValidacion });
  }

  const pasarela = PASARELAS[tarjeta.franquicia.toUpperCase()] || null;
  if (!pasarela) {
    logger.warn(`[RECHAZADO] Franquicia no soportada: ${tarjeta.franquicia}`);
    return res.status(400).json({ error: 'Tarjeta no soportada' });
  }

  // Control de duplicidad con log de advertencia
  const transaccionesPedido = await obtenerPorPedido(pedidoId);
  const yaPagada = transaccionesPedido.some(
    (tx) => tx.estado === 'No Liquidado' || tx.estado === 'Liquidado'
  );

  if (yaPagada) {
    logger.warn(`[BLOQUEADO] Control de duplicidad activado. La reserva #${pedidoId} ya registra un pago exitoso.`);
    return res.status(409).json({ error: 'Error: Cobro duplicado, esta reserva ya fue pagada' });
  }

  // Crear transacción en PENDIENTE
  const transaccion = await crearTransaccion({
    id_pedido: pedidoId,
    empresa_id,
    monto,
    franquicia: pasarela.franquicia,
    tarjeta_enmascarada: enmascararTarjeta(tarjeta.pan_number),
  });

  try {
    const body     = pasarela.mapearBody(tarjeta);
    logger.info(`[CONEXIÓN] Enviando petición a la pasarela ${pasarela.franquicia}...`);
    
    const response = await axios.post(pasarela.url, body, { validateStatus: () => true });
    const data     = response.data;

    const estado           = pasarela.fueExitoso(data) ? 'No Liquidado' : 'RECHAZADO';
    const codigo_respuesta = pasarela.codigoRespuesta(data);

    await actualizarTransaccion(transaccion.id, { estado, codigo_respuesta });

    // 👇 AQUÍ ESTÁ EL REPORTE FINAL DEL LOG QUE HACÍA FALTA 👇
    logger.info(`[RESULTADO BANCO] Reserva #${pedidoId} procesada. Estado en pasarela: ${estado}. Código Aut: ${codigo_respuesta}\n`);

    if (estado === 'No Liquidado') {
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

    logger.error(`[ERROR DE RED] La pasarela ${tarjeta?.franquicia} está caída o no responde. Detalle: ${err.message}\n`);

    return res.status(503).json({ error: 'Servicio de pasarela de pagos no disponible' });
  }
};