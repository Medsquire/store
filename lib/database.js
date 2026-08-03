const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_DATABASE,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    connectTimeout: 15000
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10)
  }
};

// Validate required config — warn only (don't exit; Vercel serverless must not crash at import)
if (!config.server) {
  console.warn('⚠️  DB_SERVER not set — SQL Server features will be unavailable');
}

if (config.server) {
  console.log('[DB] Connecting to:', config.server, 'database:', config.database);
}

let pool = null;

async function getPool() {
  if (!config.server) {
    throw new Error('SQL Server is not configured (DB_SERVER env var missing)');
  }
  if (pool && pool.connected) {
    return pool;
  }

  pool = new sql.ConnectionPool(config);
  await pool.connect();
  console.log('✓ Database connected');
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('✓ Database connection closed');
  }
}

async function executeQuery(query, params = {}) {
  const pool_ = await getPool();
  const request = pool_.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  return request.query(query);
}

async function executeStoredProcedure(procName, params = {}) {
  const pool_ = await getPool();
  const request = pool_.request();

  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }

  return request.execute(procName);
}

module.exports = {
  getPool,
  closePool,
  executeQuery,
  executeStoredProcedure,
  sql
};
