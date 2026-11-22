const { Pool } = require('pg');
const env = require('./env');

/**
 * PostgreSQL Connection Pool Configuration
 * Supports connection via DATABASE_URL or discrete DB credentials
 */
const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      max: env.DB_MAX_CONNECTIONS,
      idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS
    }
  : {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      max: env.DB_MAX_CONNECTIONS,
      idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DATABASE POOL ERROR] Unexpected error on idle client:', err.message);
});

/**
 * Execute parameterized query using pool
 * @param {string} text - SQL Query text
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      // Optional logging in dev mode
      // console.log(`[SQL QUERY] ${text} - Duration: ${duration}ms, Rows: ${res.rowCount}`);
    }
    return res;
  } catch (error) {
    console.error(`[DATABASE QUERY ERROR] Query: ${text} | Message: ${error.message}`);
    throw error;
  }
}

/**
 * Acquire a client from the pool (e.g. for transactions)
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Transaction execution wrapper
 * @param {Function} callback - Async function that receives the connected client
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check database connectivity
 */
async function testConnection() {
  try {
    const res = await query('SELECT NOW() AS current_time');
    return {
      connected: true,
      time: res.rows[0].current_time
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message
    };
  }
}

/**
 * Close database pool
 */
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  withTransaction,
  testConnection,
  close
};
