import { ApiProperty } from '@nestjs/swagger';

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export class DatabaseHealthDto {
  @ApiProperty({ enum: ['connected', 'disconnected', 'error'] })
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty({ required: false })
  latency?: number;

  @ApiProperty({ required: false })
  error?: string;
}

export class RedisHealthDto {
  @ApiProperty({ enum: ['connected', 'disconnected', 'error'] })
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty({ required: false })
  error?: string;
}

export class ServiceDependenciesDto {
  @ApiProperty({ type: DatabaseHealthDto })
  database: DatabaseHealthDto;

  @ApiProperty({ type: RedisHealthDto })
  redis: RedisHealthDto;
}

export class MemoryMetricsDto {
  @ApiProperty({ description: 'Memory used in MB' })
  used: number;

  @ApiProperty({ description: 'Total memory in MB' })
  total: number;

  @ApiProperty({ description: 'Memory usage percentage' })
  percentage: number;
}

export class CpuMetricsDto {
  @ApiProperty({ description: 'CPU usage in milliseconds' })
  usage: number;
}

export class MetricsDto {
  @ApiProperty({ type: MemoryMetricsDto })
  memory: MemoryMetricsDto;

  @ApiProperty({ type: CpuMetricsDto, required: false })
  cpu?: CpuMetricsDto;
}

export class ServiceHealthDto {
  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiProperty({ enum: ServiceStatus, description: 'Overall service status' })
  status: ServiceStatus;

  @ApiProperty({ description: 'ISO timestamp of health check' })
  timestamp: string;

  @ApiProperty({ description: 'Service uptime in seconds' })
  uptime: number;

  @ApiProperty({ description: 'Service version' })
  version: string;

  @ApiProperty({ description: 'Environment (development, production, etc.)' })
  environment: string;

  @ApiProperty({ type: ServiceDependenciesDto, required: false })
  services?: ServiceDependenciesDto;

  @ApiProperty({ type: MetricsDto, required: false })
  metrics?: MetricsDto;

  @ApiProperty({ description: 'Error message if unhealthy', required: false })
  error?: string;

  @ApiProperty({ description: 'Service URL', required: false })
  url?: string;
}

export class ServiceListItemDto {
  @ApiProperty({ description: 'Service name' })
  serviceName: string;

  @ApiProperty({ enum: ServiceStatus, description: 'Service status' })
  status: ServiceStatus;

  @ApiProperty({ description: 'Service host' })
  host: string;

  @ApiProperty({ description: 'Service port' })
  port: number;

  @ApiProperty({ description: 'Service URL' })
  url: string;

  @ApiProperty({ description: 'Service start time' })
  startedAt: string;

  @ApiProperty({ description: 'Last health check time' })
  lastCheck: string;

  @ApiProperty({ description: 'Response time in milliseconds', required: false })
  responseTime?: number;
}

export class ServicesListDto {
  @ApiProperty({ type: [ServiceListItemDto], description: 'List of services' })
  services: ServiceListItemDto[];

  @ApiProperty({ description: 'Total number of services' })
  total: number;

  @ApiProperty({ description: 'Number of healthy services' })
  healthy: number;

  @ApiProperty({ description: 'Number of degraded services' })
  degraded: number;

  @ApiProperty({ description: 'Number of unhealthy services' })
  unhealthy: number;

  @ApiProperty({ description: 'Number of unknown services' })
  unknown: number;

  @ApiProperty({ description: 'Timestamp of the list generation' })
  timestamp: string;
}
