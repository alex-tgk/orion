import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  poolSize: number;
  connectionTimeout: number;
}

export default registerAs(
  'database',
  (): DatabaseConfig => {
    const url = process.env.DATABASE_URL;

    // Parse DATABASE_URL if provided, otherwise use individual settings
    if (url) {
      const parsed = new URL(url);
      return {
        url,
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        username: parsed.username,
        password: parsed.password,
        database: parsed.pathname.slice(1),
        ssl: process.env.DATABASE_SSL === 'true',
        poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
        connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10),
      };
    }

    // Fallback to individual environment variables
    return {
      url: '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'orion',
      password: process.env.DB_PASSWORD || 'orion_dev',
      database: process.env.DB_NAME || 'orion_dev',
      ssl: process.env.DATABASE_SSL === 'true',
      poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
      connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10),
    };
  },
);