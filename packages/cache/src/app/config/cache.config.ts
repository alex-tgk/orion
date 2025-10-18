import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class CacheConfig {
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  REDIS_DB: number = 0;

  @IsInt()
  @Min(1)
  @IsOptional()
  DEFAULT_TTL: number = 3600; // 1 hour in seconds

  @IsInt()
  @Min(1)
  @IsOptional()
  MAX_CACHE_SIZE: number = 10000; // Maximum number of keys

  @IsInt()
  @Min(1)
  @IsOptional()
  CONNECTION_TIMEOUT: number = 5000; // Connection timeout in ms

  @IsInt()
  @Min(1)
  @IsOptional()
  MAX_RETRIES: number = 3;
}

export default registerAs('cache', () => {
  const config = plainToClass(CacheConfig, {
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
    DEFAULT_TTL: process.env.DEFAULT_TTL ? parseInt(process.env.DEFAULT_TTL, 10) : undefined,
    MAX_CACHE_SIZE: process.env.MAX_CACHE_SIZE ? parseInt(process.env.MAX_CACHE_SIZE, 10) : undefined,
    CONNECTION_TIMEOUT: process.env.CONNECTION_TIMEOUT
      ? parseInt(process.env.CONNECTION_TIMEOUT, 10)
      : undefined,
    MAX_RETRIES: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES, 10) : undefined,
  });

  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Cache configuration validation failed: ${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ')}`,
    );
  }

  return config;
});
