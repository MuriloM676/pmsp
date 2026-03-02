// src/config/database.js
const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  min:      parseInt(process.env.DB_POOL_MIN || '2', 10),
  max:      parseInt(process.env.DB_POOL_MAX || '10', 10),
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => logger.debug('Nova conexão PostgreSQL estabelecida'));
pool.on('error', (err) => logger.error('Erro inesperado no pool PostgreSQL', { error: err.message }));

/**
 * Executa uma query com parâmetros
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executada', { duration, rows: result.rowCount });
    return result;
  } catch (err) {
    logger.error('Erro na query', { text, error: err.message });
    throw err;
  }
};

/**
 * Retorna um cliente do pool para uso em transações
 */
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);

  // Wrap para log
  client.query = async (...args) => {
    const start = Date.now();
    const result = await originalQuery(...args);
    logger.debug('Query em transação', { duration: Date.now() - start });
    return result;
  };

  return client;
};

/**
 * Executa uma função dentro de uma transação
 * Faz rollback automático em caso de erro
 */
const transaction = async (fn) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, transaction, pool };
