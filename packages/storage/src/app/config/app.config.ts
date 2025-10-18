import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  port: number;
  corsOrigin: string;
  apiPrefix: string;
  shutdownTimeout: number;
  maxFileSize: number;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || process.env.STORAGE_PORT || '3008', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    apiPrefix: process.env.API_PREFIX || 'api',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB default
  }),
);
