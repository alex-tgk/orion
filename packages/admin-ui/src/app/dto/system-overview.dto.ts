import { ApiProperty } from '@nestjs/swagger';

/**
 * Key metrics for system overview
 */
export class KeyMetricsDto {
  @ApiProperty({
    description: 'Total requests across all services in the time period',
    example: 125430,
  })
  totalRequests: number;

  @ApiProperty({
    description: 'Average response time in milliseconds',
    example: 45.3,
  })
  avgResponseTime: number;

  @ApiProperty({
    description: 'Error rate percentage',
    example: 2.5,
  })
  errorRate: number;

  @ApiProperty({
    description: 'Total memory used across all services in MB',
    example: 2048,
  })
  totalMemoryUsed: number;

  @ApiProperty({
    description: 'Average CPU usage percentage across all services',
    example: 35.7,
  })
  avgCpuUsage: number;
}

/**
 * Uptime summary
 */
export class UptimeSummaryDto {
  @ApiProperty({
    description: 'System uptime in seconds',
    example: 86400,
  })
  systemUptime: number;

  @ApiProperty({
    description: 'Average service uptime in seconds',
    example: 43200,
  })
  avgServiceUptime: number;
}

/**
 * System overview DTO
 *
 * Provides a high-level snapshot of the ORION platform's health and performance.
 * This is designed for dashboard displays and quick status checks.
 */
export class SystemOverviewDto {
  @ApiProperty({
    enum: ['healthy', 'degraded', 'unhealthy'],
    description: 'Overall system health status',
    example: 'healthy',
  })
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Total number of registered services',
    example: 18,
  })
  totalServices: number;

  @ApiProperty({
    description: 'Number of healthy services',
    example: 16,
  })
  healthyServices: number;

  @ApiProperty({
    description: 'Number of degraded services',
    example: 1,
  })
  degradedServices: number;

  @ApiProperty({
    description: 'Number of unhealthy services',
    example: 0,
  })
  unhealthyServices: number;

  @ApiProperty({
    description: 'Number of services with unknown status',
    example: 1,
  })
  unknownServices: number;

  @ApiProperty({
    type: KeyMetricsDto,
    description: 'Key performance indicators',
  })
  keyMetrics: KeyMetricsDto;

  @ApiProperty({
    type: UptimeSummaryDto,
    description: 'Uptime information',
  })
  uptime: UptimeSummaryDto;

  @ApiProperty({
    description: 'Timestamp when this overview was generated',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;
}
