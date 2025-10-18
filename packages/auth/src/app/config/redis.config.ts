import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  enabled: boolean;
  url: string;
  host: string;
  port: number;
  password: string;
  db: number;
  ttl: number;
  connectTimeout: number;
  commandTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export default registerAs(
  'redis',
  (): RedisConfig => {
    const url = process.env.REDIS_URL;
    const enabled = process.env.REDIS_ENABLED !== 'false';

    // Parse REDIS_URL if provided
    if (url) {
      const parsed = new URL(url);
      return {
        enabled,
        url,
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        password: parsed.password || '',
        db: parseInt(process.env.REDIS_DB || '0', 10),
        ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
        commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
        retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3', 10),
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
      };
    }

    // Fallback to individual environment variables
    return {
      enabled,
      url: '',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10),
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
      retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    };
  },
);