const {
  liquidarMasivoPorEmpresa,
  obtenerPendientesPorEmpresaYFechas,
} = require('../db/transaccionesRepository');

function extraerEmpresaId(req) {
  return req.user?.empresa_id ?? req.body?.empresa_id;
}

exports.liquidarMasivo = async (req, res) => {
  try {
    const empresa_id = extraerEmpresaId(req);

    if (!empresa_id)
      return res.status(400).json({ error: 'empresa_id es requerido' });

    const actualizadas = await liquidarMasivoPorEmpresa(empresa_id);

    return res.status(200).json({
      empresa_id,
      actualizadas,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error en liquidación masiva' });
  }
};

exports.generarReporte = async (req, res) => {
  try {
    const empresa_id = extraerEmpresaId(req);
    const { fecha_inicio, fecha_fin } = req.query;

    if (!empresa_id)
      return res.status(400).json({ error: 'empresa_id es requerido' });

    if (!fecha_inicio || !fecha_fin)
      return res.status(400).json({ error: 'fecha_inicio y fecha_fin son requeridas' });

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()))
      return res.status(400).json({ error: 'Formato de fecha inválido' });

    if (inicio > fin)
      return res.status(400).json({ error: 'Rango de fechas inválido: fecha_inicio debe ser menor o igual a fecha_fin' });

    const reporte = await obtenerPendientesPorEmpresaYFechas(empresa_id, fecha_inicio, fecha_fin);

    return res.status(200).json({
      empresa_id,
      fecha_inicio,
      fecha_fin,
      total: reporte.total,
      transacciones: reporte.pendientes,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error al generar reporte' });
  }
};
