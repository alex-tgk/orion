import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export class DependencyHealthDto {
  @ApiProperty({ description: 'Dependency name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Health status', enum: HealthStatus })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiProperty({ description: 'Is dependency available' })
  @IsBoolean()
  available: boolean;

  @ApiProperty({ description: 'Response time in ms' })
  @IsOptional()
  responseTime?: number;

  @ApiProperty({ description: 'Additional details' })
  @IsObject()
  @IsOptional()
  details?: Record<string, unknown>;

  @ApiProperty({ description: 'Error message if unhealthy' })
  @IsString()
  @IsOptional()
  error?: string;
}

export class HealthCheckDto {
  @ApiProperty({ description: 'Overall health status', enum: HealthStatus })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'Service version' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Server uptime in seconds' })
  @IsOptional()
  uptime?: number;

  @ApiProperty({ description: 'Timestamp of health check' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Dependencies health status' })
  @IsOptional()
  dependencies?: Record<string, DependencyHealthDto>;
}

export class AggregatedHealthDto {
  @ApiProperty({ description: 'Overall health status', enum: HealthStatus })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiProperty({ description: 'Timestamp of aggregation' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Health status of all services' })
  @IsObject()
  services: Record<string, HealthCheckDto>;

  @ApiProperty({ description: 'Infrastructure health' })
  @IsObject()
  infrastructure: {
    database: DependencyHealthDto;
    redis: DependencyHealthDto;
    rabbitmq: DependencyHealthDto;
  };

  @ApiProperty({ description: 'Total services count' })
  total: number;

  @ApiProperty({ description: 'Healthy services count' })
  healthy: number;

  @ApiProperty({ description: 'Degraded services count' })
  degraded: number;

  @ApiProperty({ description: 'Unhealthy services count' })
  unhealthy: number;
}
