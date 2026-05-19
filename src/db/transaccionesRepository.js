const pool = require('./pool');

/**
 * Crea una transacción en estado PENDIENTE y retorna el registro completo.
 */
async function crearTransaccion({ id_pedido, empresa_id, monto, franquicia, tarjeta_enmascarada }) {
  const { rows } = await pool.query(
    `INSERT INTO transacciones (id_pedido, empresa_id, monto, franquicia, tarjeta_enmascarada)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id_pedido, empresa_id, monto, franquicia, tarjeta_enmascarada]
  );
  return rows[0];
}

/**
 * Actualiza el estado y código de respuesta de una transacción existente.
 */
async function actualizarTransaccion(id, { estado, codigo_respuesta }) {
  const { rows } = await pool.query(
    `UPDATE transacciones
     SET estado = $1, codigo_respuesta = $2
     WHERE id = $3
     RETURNING *`,
    [estado, codigo_respuesta ?? null, id]
  );
  return rows[0];
}

/**
 * Retorna todas las transacciones de un pedido.
 */
async function obtenerPorPedido(id_pedido) {
  const { rows } = await pool.query(
    `SELECT * FROM transacciones
     WHERE id_pedido = $1
     ORDER BY fecha_creacion DESC`,
    [id_pedido]
  );
  return rows;
}

/**
 * Retorna una transacción por su id.
 */
async function obtenerPorId(id) {
  const { rows } = await pool.query(
    'SELECT * FROM transacciones WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

/**
 * Liquida de forma masiva todas las transacciones No Liquidado de una empresa.
 */
async function liquidarMasivoPorEmpresa(empresa_id) {
  const { rowCount } = await pool.query(
    `UPDATE transacciones
     SET estado = 'Liquidado'
     WHERE empresa_id = $1
       AND estado = 'No Liquidado'`,
    [empresa_id]
  );

  return rowCount;
}

/**
 * Obtiene transacciones No Liquidado por empresa y rango de fechas, junto al total.
 */
async function obtenerPendientesPorEmpresaYFechas(empresa_id, fecha_inicio, fecha_fin) {
  const pendientesResult = await pool.query(
    `SELECT *
     FROM transacciones
     WHERE empresa_id = $1
       AND estado = 'No Liquidado'
       AND fecha_creacion::date BETWEEN $2::date AND $3::date
     ORDER BY fecha_creacion DESC`,
    [empresa_id, fecha_inicio, fecha_fin]
  );

  const totalResult = await pool.query(
    `SELECT COALESCE(SUM(monto), 0) AS total
     FROM transacciones
     WHERE empresa_id = $1
       AND estado = 'No Liquidado'
       AND fecha_creacion::date BETWEEN $2::date AND $3::date`,
    [empresa_id, fecha_inicio, fecha_fin]
  );

  return {
    pendientes: pendientesResult.rows,
    total: totalResult.rows[0].total,
  };
}

module.exports = {
  crearTransaccion,
  actualizarTransaccion,
  obtenerPorPedido,
  obtenerPorId,
  liquidarMasivoPorEmpresa,
  obtenerPendientesPorEmpresaYFechas,
};