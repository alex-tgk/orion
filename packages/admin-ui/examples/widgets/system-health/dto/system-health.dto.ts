import { ApiProperty } from '@nestjs/swagger';

export class HealthMetricsDto {
  @ApiProperty({ description: 'CPU usage percentage', example: 45.2 })
  cpu: number;

  @ApiProperty({ description: 'Memory usage percentage', example: 67.8 })
  memory: number;

  @ApiProperty({ description: 'Disk usage percentage', example: 72.5 })
  disk: number;

  @ApiProperty({ description: 'System uptime in seconds', example: 3600 })
  uptime: number;

  @ApiProperty({ description: 'Timestamp of metrics', example: '2025-01-15T10:30:00Z' })
  timestamp: Date;
}

export class AlertDto {
  @ApiProperty({ description: 'Alert ID', example: 'cpu-1642243800000' })
  id: string;

  @ApiProperty({ description: 'Alert type', enum: ['cpu', 'memory', 'disk'] })
  type: 'cpu' | 'memory' | 'disk';

  @ApiProperty({ description: 'Alert severity', enum: ['warning', 'critical'] })
  severity: 'warning' | 'critical';

  @ApiProperty({ description: 'Alert message', example: 'CPU usage is critical: 92.5%' })
  message: string;

  @ApiProperty({ description: 'Current value', example: 92.5 })
  value: number;

  @ApiProperty({ description: 'Threshold value', example: 80 })
  threshold: number;

  @ApiProperty({ description: 'Alert timestamp', example: '2025-01-15T10:30:00Z' })
  timestamp: Date;
}

export class SystemHealthDto {
  @ApiProperty({ description: 'Current health metrics', type: HealthMetricsDto })
  current: HealthMetricsDto;

  @ApiProperty({
    description: 'Historical health metrics',
    type: [HealthMetricsDto],
    required: false,
  })
  history?: HealthMetricsDto[];

  @ApiProperty({ description: 'Active alerts', type: [AlertDto] })
  alerts: AlertDto[];

  @ApiProperty({ description: 'Response timestamp', example: '2025-01-15T10:30:00Z' })
  timestamp: string;
}
