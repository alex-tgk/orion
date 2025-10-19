import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';

export enum ServiceStatus {
  ONLINE = 'online',
  DEGRADED = 'degraded',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

export class ServiceMetricsDto {
  @ApiProperty({ description: 'CPU usage percentage' })
  @IsNumber()
  cpu: number;

  @ApiProperty({ description: 'Memory usage in MB' })
  @IsNumber()
  memory: number;

  @ApiProperty({ description: 'Uptime in seconds' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: 'Request count (if available)' })
  @IsNumber()
  @IsOptional()
  requestCount?: number;

  @ApiProperty({ description: 'Error rate percentage' })
  @IsNumber()
  @IsOptional()
  errorRate?: number;

  @ApiProperty({ description: 'Average response time in ms' })
  @IsNumber()
  @IsOptional()
  avgResponseTime?: number;
}

export class ServiceHealthDto {
  @ApiProperty({ description: 'Overall health status' })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiProperty({ description: 'Database connection status' })
  @IsBoolean()
  @IsOptional()
  database?: boolean;

  @ApiProperty({ description: 'Redis connection status' })
  @IsBoolean()
  @IsOptional()
  redis?: boolean;

  @ApiProperty({ description: 'RabbitMQ connection status' })
  @IsBoolean()
  @IsOptional()
  rabbitmq?: boolean;

  @ApiProperty({ description: 'Health check timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Additional details' })
  @IsObject()
  @IsOptional()
  details?: Record<string, any>;
}

export class ServiceDto {
  @ApiProperty({ description: 'Service unique identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Service version' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Service port' })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'Service URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Service status', enum: ServiceStatus })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiProperty({ description: 'PM2 process ID' })
  @IsNumber()
  @IsOptional()
  pm2Id?: number;

  @ApiProperty({ description: 'Service health details' })
  @IsOptional()
  health?: ServiceHealthDto;

  @ApiProperty({ description: 'Service metrics' })
  @IsOptional()
  metrics?: ServiceMetricsDto;
}

export class ServiceListResponseDto {
  @ApiProperty({ description: 'List of services', type: [ServiceDto] })
  services: ServiceDto[];

  @ApiProperty({ description: 'Total service count' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Count of online services' })
  @IsNumber()
  online: number;

  @ApiProperty({ description: 'Count of offline services' })
  @IsNumber()
  offline: number;
}

export class ServiceActionDto {
  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Service ID' })
  @IsString()
  serviceId: string;

  @ApiProperty({ description: 'Action result' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Result message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Timestamp of action' })
  @IsString()
  timestamp: string;
}
