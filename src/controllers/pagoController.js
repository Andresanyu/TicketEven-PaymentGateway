const axios = require('axios');

exports.procesarPago = async (req, res) => {
  try {
    const { tarjeta } = req.body || {};
    if (!tarjeta || tarjeta.numero === undefined || tarjeta.numero === null) {
      return res.status(400).json({ error: 'Tarjeta no proporcionada' });
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
    return res.status(502).json({ error: 'Error al comunicarse con proveedor de pago' });
  }
};
