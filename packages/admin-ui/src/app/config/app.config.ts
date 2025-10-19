import { registerAs } from '@nestjs/config';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class AppConfig {
  @IsNumber()
  @Min(1024)
  @Max(65535)
  ADMIN_API_PORT: number = 3004;

  @IsString()
  NODE_ENV: string = 'development';

  @IsString()
  @IsOptional()
  AUTH_SERVICE_URL?: string = 'http://localhost:3001';

  @IsString()
  @IsOptional()
  GATEWAY_SERVICE_URL?: string = 'http://localhost:3100';

  @IsString()
  @IsOptional()
  AI_WRAPPER_URL?: string = 'http://localhost:3200';

  @IsString()
  @IsOptional()
  NOTIFICATIONS_SERVICE_URL?: string = 'http://localhost:3002';

  @IsString()
  @IsOptional()
  ANALYTICS_SERVICE_URL?: string = 'http://localhost:3003';

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  REDIS_URL?: string = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  RABBITMQ_URL?: string = 'amqp://localhost:5672';

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = 'http://localhost:3000';
}

export default registerAs('app', () => {
  const config = plainToClass(AppConfig, {
    ADMIN_API_PORT: parseInt(process.env.ADMIN_API_PORT || '3004', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
    GATEWAY_SERVICE_URL: process.env.GATEWAY_SERVICE_URL,
    AI_WRAPPER_URL: process.env.AI_WRAPPER_URL,
    NOTIFICATIONS_SERVICE_URL: process.env.NOTIFICATIONS_SERVICE_URL,
    ANALYTICS_SERVICE_URL: process.env.ANALYTICS_SERVICE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
  });

  return config;
});
