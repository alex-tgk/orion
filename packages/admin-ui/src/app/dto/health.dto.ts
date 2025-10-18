import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsArray, IsOptional, IsBoolean, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum HealthCheckStatus {
  PASS = 'pass',
  WARN = 'warn',
  FAIL = 'fail',
}

export class HealthCheck {
  @ApiProperty({ description: 'Health check name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: HealthCheckStatus, description: 'Health check status' })
  @IsEnum(HealthCheckStatus)
  status: HealthCheckStatus;

  @ApiPropertyOptional({ description: 'Health check message' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({ description: 'Health check timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Response time in ms' })
  @IsNumber()
  @IsOptional()
  responseTime?: number;
}

export class ServiceHealth {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  serviceName: string;

  @ApiProperty({ enum: ServiceStatus, description: 'Service status' })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiProperty({ description: 'Service uptime percentage' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: 'Last health check timestamp' })
  @IsDateString()
  lastCheckTimestamp: string;

  @ApiProperty({ description: 'Average response time in ms' })
  @IsNumber()
  responseTime: number;

  @ApiProperty({ description: 'Service version' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Service dependencies', type: [String] })
  @IsArray()
  @IsString({ each: true })
  dependencies: string[];

  @ApiProperty({ description: 'Individual health checks', type: [HealthCheck] })
  @ValidateNested({ each: true })
  @Type(() => HealthCheck)
  @IsArray()
  checks: HealthCheck[];

  @ApiPropertyOptional({ description: 'Error message if unhealthy' })
  @IsString()
  @IsOptional()
  error?: string;
}

export class SystemHealthOverview {
  @ApiProperty({ enum: ServiceStatus, description: 'Overall system status' })
  @IsEnum(ServiceStatus)
  overallStatus: ServiceStatus;

  @ApiProperty({ description: 'Total number of services' })
  @IsNumber()
  totalServices: number;

  @ApiProperty({ description: 'Number of healthy services' })
  @IsNumber()
  healthyServices: number;

  @ApiProperty({ description: 'Number of degraded services' })
  @IsNumber()
  degradedServices: number;

  @ApiProperty({ description: 'Number of unhealthy services' })
  @IsNumber()
  unhealthyServices: number;

  @ApiProperty({ description: 'Number of active alerts' })
  @IsNumber()
  activeAlerts: number;

  @ApiProperty({ description: 'Number of critical alerts' })
  @IsNumber()
  criticalAlerts: number;

  @ApiProperty({ description: 'Timestamp of overview' })
  @IsDateString()
  timestamp: string;
}

export class DependencyNode {
  @ApiProperty({ description: 'Node ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  serviceName: string;

  @ApiProperty({ enum: ServiceStatus, description: 'Service status' })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiProperty({ description: 'Node type', enum: ['service', 'database', 'external'] })
  @IsEnum(['service', 'database', 'external'])
  type: 'service' | 'database' | 'external';

  @ApiPropertyOptional({ description: 'Node position', type: 'object' })
  @IsOptional()
  position?: { x: number; y: number };
}

export class DependencyEdge {
  @ApiProperty({ description: 'Edge ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Source node ID' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Target node ID' })
  @IsString()
  target: string;

  @ApiProperty({ description: 'Dependency type', enum: ['sync', 'async', 'data'] })
  @IsEnum(['sync', 'async', 'data'])
  type: 'sync' | 'async' | 'data';
}

export class ServiceDependencyGraph {
  @ApiProperty({ description: 'Graph nodes', type: [DependencyNode] })
  @ValidateNested({ each: true })
  @Type(() => DependencyNode)
  @IsArray()
  nodes: DependencyNode[];

  @ApiProperty({ description: 'Graph edges', type: [DependencyEdge] })
  @ValidateNested({ each: true })
  @Type(() => DependencyEdge)
  @IsArray()
  edges: DependencyEdge[];
}

export class HealthHistoryDataPoint {
  @ApiProperty({ description: 'Timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ enum: ServiceStatus, description: 'Status at this point' })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiProperty({ description: 'Response time in ms' })
  @IsNumber()
  responseTime: number;

  @ApiProperty({ description: 'Uptime percentage' })
  @IsNumber()
  uptime: number;
}

export class HealthHistoryResponse {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  serviceName: string;

  @ApiProperty({ description: 'Time range in hours' })
  @IsNumber()
  timeRangeHours: number;

  @ApiProperty({ description: 'Historical data points', type: [HealthHistoryDataPoint] })
  @ValidateNested({ each: true })
  @Type(() => HealthHistoryDataPoint)
  @IsArray()
  data: HealthHistoryDataPoint[];

  @ApiProperty({ description: 'Average uptime in period' })
  @IsNumber()
  averageUptime: number;

  @ApiProperty({ description: 'Number of incidents' })
  @IsNumber()
  incidentCount: number;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export class Alert {
  @ApiProperty({ description: 'Alert ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  serviceName: string;

  @ApiProperty({ enum: AlertSeverity, description: 'Alert severity' })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Alert timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ enum: AlertStatus, description: 'Alert status' })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiPropertyOptional({ description: 'User who acknowledged' })
  @IsString()
  @IsOptional()
  acknowledgedBy?: string;

  @ApiPropertyOptional({ description: 'Resolution timestamp' })
  @IsDateString()
  @IsOptional()
  resolvedAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class AlertsListResponse {
  @ApiProperty({ description: 'Alerts', type: [Alert] })
  @ValidateNested({ each: true })
  @Type(() => Alert)
  @IsArray()
  alerts: Alert[];

  @ApiProperty({ description: 'Total count' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Active count' })
  @IsNumber()
  active: number;

  @ApiProperty({ description: 'Critical count' })
  @IsNumber()
  critical: number;
}

export class ServiceHealthUpdate {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  serviceName: string;

  @ApiProperty({ enum: ServiceStatus, description: 'New status' })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiProperty({ description: 'Update timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Previous status' })
  @IsEnum(ServiceStatus)
  @IsOptional()
  previousStatus?: ServiceStatus;

  @ApiPropertyOptional({ description: 'Change reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}
