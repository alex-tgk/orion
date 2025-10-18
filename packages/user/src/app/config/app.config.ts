import { registerAs } from '@nestjs/config';

export interface AppConfig {
  env: string;
  port: number;
  serviceName: string;
  corsOrigin: string;
  apiPrefix: string;
  shutdownTimeout: number;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3002', 10),
    serviceName: process.env.SERVICE_NAME || 'user-service',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10),
  }),
);
