import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  connectionTimeout: number;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env.ANALYTICS_DATABASE_URL || 'postgresql://orion:orion_dev_password@localhost:5432/orion_analytics',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  }),
);
