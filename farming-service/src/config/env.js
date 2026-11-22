const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  // Server
  PORT: parseInt(process.env.SERVER_PORT || '8082', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/farming_db',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'farming_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  DB_IDLE_TIMEOUT_MS: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),

  // Security & JWT
  JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH || 'keys/public.pem',
  JWT_ISSUER: process.env.JWT_ISSUER || 'urn:soa:user-service',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'soa-api',

  // Inter-service calls
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:8081',
  USER_SERVICE_KEY: process.env.USER_SERVICE_KEY || process.env.INTERNAL_SERVICE_KEY || '',
  ACCESS_STATE_TIMEOUT_MS: parseInt(process.env.ACCESS_STATE_TIMEOUT_MS || '1000', 10),
  TRADING_SERVICE_KEY: process.env.TRADING_SERVICE_KEY || 'trading-farming-internal-secret-key'
};

module.exports = env;
