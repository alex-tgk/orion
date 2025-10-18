import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class GatewayConfig {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  NODE_ENV: string = 'development';

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = 'http://localhost:4200';

  // Service URLs
  @IsString()
  AUTH_SERVICE_URL: string = 'http://localhost:3001';

  @IsString()
  USER_SERVICE_URL: string = 'http://localhost:3002';

  @IsString()
  NOTIFICATION_SERVICE_URL: string = 'http://localhost:3003';

  // Redis Configuration
  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @IsOptional()
  REDIS_DB?: number = 0;

  // JWT Configuration
  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  @IsOptional()
  JWT_CACHE_TTL?: number = 300; // 5 minutes in seconds

  // Rate Limiting Configuration
  @IsNumber()
  @IsOptional()
  RATE_LIMIT_DEFAULT?: number = 100;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_WINDOW?: number = 60; // seconds

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_AUTH_LOGIN?: number = 5;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_AUTH_REFRESH?: number = 10;

  // Security Configuration
  @IsBoolean()
  @IsOptional()
  ENABLE_HTTPS_REDIRECT?: boolean = false;

  @IsNumber()
  @IsOptional()
  REQUEST_MAX_SIZE?: number = 10485760; // 10MB in bytes

  // Service Health Check
  @IsNumber()
  @IsOptional()
  HEALTH_CHECK_TIMEOUT?: number = 5000; // 5 seconds
}

export default registerAs('gateway', () => {
  const config = plainToClass(GatewayConfig, {
    PORT: parseInt(process.env['PORT'] || '3000', 10),
    NODE_ENV: process.env['NODE_ENV'] || 'development',
    CORS_ORIGIN: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
    
    // Service URLs
    AUTH_SERVICE_URL: process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001',
    USER_SERVICE_URL: process.env['USER_SERVICE_URL'] || 'http://localhost:3002',
    NOTIFICATION_SERVICE_URL: process.env['NOTIFICATION_SERVICE_URL'] || 'http://localhost:3003',
    
    // Redis
    REDIS_HOST: process.env['REDIS_HOST'] || 'localhost',
    REDIS_PORT: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
    REDIS_DB: parseInt(process.env['REDIS_DB'] || '0', 10),
    
    // JWT
    JWT_SECRET: process.env['JWT_SECRET'] || 'development-secret-key-change-in-production',
    JWT_CACHE_TTL: parseInt(process.env['JWT_CACHE_TTL'] || '300', 10),
    
    // Rate Limiting
    RATE_LIMIT_DEFAULT: parseInt(process.env['RATE_LIMIT_DEFAULT'] || '100', 10),
    RATE_LIMIT_WINDOW: parseInt(process.env['RATE_LIMIT_WINDOW'] || '60', 10),
    RATE_LIMIT_AUTH_LOGIN: parseInt(process.env['RATE_LIMIT_AUTH_LOGIN'] || '5', 10),
    RATE_LIMIT_AUTH_REFRESH: parseInt(process.env['RATE_LIMIT_AUTH_REFRESH'] || '10', 10),
    
    // Security
    ENABLE_HTTPS_REDIRECT: process.env['ENABLE_HTTPS_REDIRECT'] === 'true',
    REQUEST_MAX_SIZE: parseInt(process.env['REQUEST_MAX_SIZE'] || '10485760', 10),
    
    // Health Check
    HEALTH_CHECK_TIMEOUT: parseInt(process.env['HEALTH_CHECK_TIMEOUT'] || '5000', 10),
  });

  return config;
});
