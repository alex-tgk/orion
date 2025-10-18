import { ApiProperty } from '@nestjs/swagger';

export class ServiceStatsDto {
  @ApiProperty({ description: 'Total services registered' })
  total: number;

  @ApiProperty({ description: 'Services currently running' })
  running: number;

  @ApiProperty({ description: 'Healthy services' })
  healthy: number;

  @ApiProperty({ description: 'Degraded services' })
  degraded: number;

  @ApiProperty({ description: 'Unhealthy services' })
  unhealthy: number;

  @ApiProperty({ description: 'Services with unknown status' })
  unknown: number;
}

export class RequestStatsDto {
  @ApiProperty({ description: 'Total requests across all services' })
  total: number;

  @ApiProperty({ description: 'Requests per second (average)' })
  requestsPerSecond: number;

  @ApiProperty({ description: 'Average response time in ms' })
  avgResponseTime: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Error rate percentage' })
  errorRate: number;
}

export class ResourceStatsDto {
  @ApiProperty({ description: 'Total memory used across all services in MB' })
  totalMemoryUsed: number;

  @ApiProperty({ description: 'Average memory per service in MB' })
  avgMemoryPerService: number;

  @ApiProperty({ description: 'Average CPU usage percentage' })
  avgCpuUsage: number;

  @ApiProperty({ description: 'Total active database connections' })
  totalDatabaseConnections: number;

  @ApiProperty({ description: 'Total cache hit rate percentage' })
  cacheHitRate: number;
}

export class ErrorStatsDto {
  @ApiProperty({ description: 'Total errors in time period' })
  total: number;

  @ApiProperty({ description: 'Critical errors' })
  critical: number;

  @ApiProperty({ description: 'Server errors (5xx)' })
  serverErrors: number;

  @ApiProperty({ description: 'Client errors (4xx)' })
  clientErrors: number;

  @ApiProperty({ description: 'Error rate per minute' })
  errorRate: number;
}

export class UpTimeStatsDto {
  @ApiProperty({ description: 'System uptime in seconds' })
  systemUptime: number;

  @ApiProperty({ description: 'Average service uptime in seconds' })
  avgServiceUptime: number;

  @ApiProperty({ description: 'Oldest service uptime in seconds' })
  oldestServiceUptime: number;
}

export class SystemStatsDto {
  @ApiProperty({ type: ServiceStatsDto, description: 'Service statistics' })
  services: ServiceStatsDto;

  @ApiProperty({ type: RequestStatsDto, description: 'Request statistics' })
  requests: RequestStatsDto;

  @ApiProperty({ type: ResourceStatsDto, description: 'Resource statistics' })
  resources: ResourceStatsDto;

  @ApiProperty({ type: ErrorStatsDto, description: 'Error statistics' })
  errors: ErrorStatsDto;

  @ApiProperty({ type: UpTimeStatsDto, description: 'Uptime statistics' })
  uptime: UpTimeStatsDto;

  @ApiProperty({ description: 'Statistics generation timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Time range for statistics in minutes' })
  timeRange: number;
}
