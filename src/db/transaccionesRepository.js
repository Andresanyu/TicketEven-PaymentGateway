const pool = require('./pool');

/**
 * Crea una transacción en estado PENDIENTE y retorna el registro completo.
 */
async function crearTransaccion({ id_pedido, monto, franquicia, tarjeta_enmascarada }) {
  const { rows } = await pool.query(
    `INSERT INTO transacciones (id_pedido, monto, franquicia, tarjeta_enmascarada)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id_pedido, monto, franquicia, tarjeta_enmascarada]
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

module.exports = {
  crearTransaccion,
  actualizarTransaccion,
  obtenerPorPedido,
  obtenerPorId,
};