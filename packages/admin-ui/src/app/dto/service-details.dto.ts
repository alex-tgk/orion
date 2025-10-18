import { ApiProperty } from '@nestjs/swagger';
import { ServiceHealthDto } from './service-health.dto';
import { ServiceMetricsDto } from './service-metrics.dto';
import { SystemEventDto } from './system-events.dto';

/**
 * Comprehensive service details DTO
 *
 * Aggregates health, metrics, and events for a complete service overview.
 * This DTO is used by the GET /api/services/:serviceName endpoint.
 */
export class ServiceDetailsDto {
  @ApiProperty({
    description: 'Service name',
    example: 'auth',
  })
  serviceName: string;

  @ApiProperty({
    type: ServiceHealthDto,
    description: 'Current health status and information',
  })
  health: ServiceHealthDto;

  @ApiProperty({
    type: ServiceMetricsDto,
    description: 'Performance metrics for the specified time range',
    required: false,
  })
  metrics?: ServiceMetricsDto;

  @ApiProperty({
    type: [SystemEventDto],
    description: 'Recent events and activity logs for this service',
  })
  recentEvents: SystemEventDto[];

  @ApiProperty({
    description: 'Timestamp when this data was last updated',
    example: '2025-01-15T10:30:00.000Z',
  })
  lastUpdated: string;
}
