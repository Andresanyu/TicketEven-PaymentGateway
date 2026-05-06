const express = require('express');
const cors = require('cors');
const pagoRoutes = require('./routes/pagoRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', pagoRoutes);

module.exports = app;
