export { default as appConfig } from './app.config';
export { default as databaseConfig } from './database.config';
export { default as redisConfig } from './redis.config';
export { default as jwtConfig } from './jwt.config';

export * from './app.config';
export * from './database.config';
export * from './redis.config';
export * from './jwt.config';
export * from './rate-limit.config';

import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import jwtConfig from './jwt.config';

export const configModules = [appConfig, databaseConfig, redisConfig, jwtConfig];

// Configuration validation schema
export const configValidationSchema = {
  NODE_ENV: ['development', 'test', 'staging', 'production'],
  PORT: /^\d+$/,
  DATABASE_URL: /^postgresql:\/\/.+/,
  JWT_SECRET: /.+/,
};