import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export class ServiceHealthDetailsDto {
  @ApiProperty({ description: 'Service version' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ description: 'Service uptime in milliseconds' })
  @IsOptional()
  @IsNumber()
  uptime?: number;

  @ApiProperty({ description: 'Memory usage information' })
  @IsOptional()
  @IsObject()
  memory?: {
    used: number;
    total: number;
  };

  @ApiProperty({ description: 'CPU usage percentage' })
  @IsOptional()
  @IsNumber()
  cpu?: number;

  @ApiProperty({ description: 'Service dependencies status' })
  @IsOptional()
  @IsObject()
  dependencies?: Record<string, string>;
}

export class ServiceHealthDto {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  service: string;

  @ApiProperty({ enum: HealthStatus, description: 'Health status' })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiProperty({ description: 'Health check response time in milliseconds' })
  @IsNumber()
  responseTime: number;

  @ApiProperty({ description: 'Health check timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Detailed health information', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceHealthDetailsDto)
  details?: ServiceHealthDetailsDto;

  @ApiProperty({ description: 'Error message if health check failed', required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class SystemHealthSummaryDto {
  @ApiProperty({ description: 'Total number of services' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Number of healthy services' })
  @IsNumber()
  healthy: number;

  @ApiProperty({ description: 'Number of unhealthy services' })
  @IsNumber()
  unhealthy: number;

  @ApiProperty({ description: 'Number of degraded services' })
  @IsNumber()
  degraded: number;
}

export class SystemHealthDto {
  @ApiProperty({ enum: ['healthy', 'degraded', 'critical'], description: 'Overall system health' })
  @IsEnum(['healthy', 'degraded', 'critical'])
  overall: 'healthy' | 'degraded' | 'critical';

  @ApiProperty({ description: 'Health check timestamp' })
  timestamp: Date;

  @ApiProperty({ type: [ServiceHealthDto], description: 'Individual service health statuses' })
  @ValidateNested({ each: true })
  @Type(() => ServiceHealthDto)
  services: ServiceHealthDto[];

  @ApiProperty({ type: SystemHealthSummaryDto, description: 'Health summary' })
  @ValidateNested()
  @Type(() => SystemHealthSummaryDto)
  summary: SystemHealthSummaryDto;
}