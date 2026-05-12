const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5435'),
  user:     process.env.DB_USER     || 'orquestador_user',
  password: process.env.DB_PASSWORD || 'orquestador_pass',
  database: process.env.DB_NAME     || 'orquestador_db',
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = pool;