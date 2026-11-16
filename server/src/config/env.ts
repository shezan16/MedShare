import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medshare?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'medshare_super_secure_jwt_secret_key_2026_devorax',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  DEFAULT_SEARCH_RADIUS_KM: parseFloat(process.env.DEFAULT_SEARCH_RADIUS_KM || '5.0'),
};
