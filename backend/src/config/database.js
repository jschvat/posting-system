/**
 * PostgreSQL database connection and query utilities
 * Raw SQL implementation without ORM
 */

const { Pool } = require('pg');
require('dotenv').config();

// Import centralized configuration
const { config } = require('../../../config/app.config');

// Database connection pool
let pool;

/**
 * Initialize database connection pool
 */
function initializeDatabase() {
  const dbConfig = {
    host: config.database.postgres.host,
    port: config.database.postgres.port,
    database: config.database.postgres.database,
    user: config.database.postgres.username,
    password: config.database.postgres.password,
    ssl: config.database.postgres.ssl ? {
      rejectUnauthorized: false
    } : false,
    ...config.database.postgres.pool
  };

  pool = new Pool(dbConfig);

  // Handle pool events
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  pool.on('connect', () => {
    if (config.database.logging) {
      console.log('✅ Connected to PostgreSQL database');
    }
  });

  return pool;
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
}

/**
 * Execute a SQL query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Object} Query result
 */
async function query(text, params = []) {
  // In test environment, use the global test database
  if (process.env.NODE_ENV === 'test' && global.testDb) {
    const { query: testQuery } = require('../__tests__/testDb');
    return await testQuery(text, params);
  }

  const start = Date.now();

  try {
    if (!pool) {
      throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }

    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (config.database.logging) {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      text,
      params,
      error: error.message
    });
    throw error;
  }
}

/**
 * Execute a transaction
 * @param {Function} callback - Function that receives client and executes queries
 * @returns {*} Result of the callback
 */
async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
async function closeConnection() {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed.');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

/**
 * Get a direct client from the pool (for advanced usage)
 */
async function getClient() {
  return await pool.connect();
}

// Export database utilities
module.exports = {
  initializeDatabase,
  testConnection,
  query,
  transaction,
  closeConnection,
  getClient,
  // Getter for the pool instance
  get pool() {
    return pool;
  }
};