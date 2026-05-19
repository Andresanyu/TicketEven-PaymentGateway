const express = require('express');
const cors = require('cors');
const pagoRoutes = require('./routes/pagoRoutes');
const tesoreriaRoutes = require('./routes/tesoreriaRoutes');
const { swaggerUi, swaggerDocument } = require('./docs/swagger');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', pagoRoutes);
app.use('/api/v1/tesoreria', tesoreriaRoutes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = app;
