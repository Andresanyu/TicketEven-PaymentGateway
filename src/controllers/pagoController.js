const axios = require('axios');

exports.procesarPago = async (req, res) => {
  try {
    const { tarjeta } = req.body || {};
    
    if (!tarjeta || tarjeta.numero === undefined || tarjeta.numero === null || !tarjeta.cvc || !tarjeta.fechaExpiracion) {
      return res.status(400).json({ error: 'Datos de tarjeta insuficientes' });
    }
    
    if (typeof tarjeta.numero !== 'number' && typeof tarjeta.numero !== 'string') {
      return res.status(400).json({ error: 'Número de tarjeta inválido' });
    }

    if (tarjeta.numero.length !== 16) {
      return res.status(400).json({ error: 'Número de tarjeta inválido' });
    }

    const numeroStr = String(tarjeta.numero);

    let url;
    if (numeroStr.startsWith('4')) {
      url = 'http://localhost:3001/api/v1/visa/validar';
    } else if (numeroStr.startsWith('5')) {
      url = 'http://localhost:3000/api/v1/mastercard/validar';
    } else {
      return res.status(400).json({ error: 'Tarjeta no soportada' });
    }

    // Allow forwarding of non-2xx responses instead of throwing
    const response = await axios.post(url, { tarjeta }, { validateStatus: () => true });

    return res.status(response.status).send(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).send(err.response.data);
    }
    return res.status(502).json({ error: err.message || 'Error al procesar el pago' });
  }
};
