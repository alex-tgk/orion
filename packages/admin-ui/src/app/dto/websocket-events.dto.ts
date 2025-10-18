import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsDate,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SystemEventType,
  AlertType,
  AlertSeverity,
  ServiceStatus,
} from '../types/websocket-events.types';

/**
 * DTOs for WebSocket Events
 * Used for validation and serialization
 */

export class SubscribeServiceHealthDto {
  @IsOptional()
  @IsString()
  serviceName?: string;
}

export class EventFilterDto {
  @IsOptional()
  @IsArray()
  @IsEnum(SystemEventType, { each: true })
  types?: SystemEventType[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceNames?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(['info', 'warning', 'error', 'critical'], { each: true })
  severities?: ('info' | 'warning' | 'error' | 'critical')[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endTime?: Date;
}

export class SubscribeSystemEventsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilterDto)
  filters?: EventFilterDto;
}

export class SubscribeMetricsDto {
  @IsOptional()
  @IsString()
  serviceName?: string;
}

export class AlertFilterDto {
  @IsOptional()
  @IsArray()
  @IsEnum(AlertType, { each: true })
  types?: AlertType[];

  @IsOptional()
  @IsArray()
  @IsEnum(AlertSeverity, { each: true })
  severities?: AlertSeverity[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceNames?: string[];

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}

export class SubscribeAlertsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AlertFilterDto)
  filters?: AlertFilterDto;
}

export class TimeRangeDto {
  @Type(() => Date)
  @IsDate()
  start: Date;

  @Type(() => Date)
  @IsDate()
  end: Date;
}

export class RequestMetricsDto {
  @IsString()
  serviceName: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  timeRange?: TimeRangeDto;
}

export class ResolveAlertDto {
  @IsString()
  alertId: string;
}

export class ServiceHealthDto {
  @IsString()
  serviceName: string;

  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @IsNumber()
  port: number;

  @Type(() => Date)
  @IsDate()
  lastHeartbeat: Date;

  @IsNumber()
  uptime: number;

  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SystemEventDto {
  @IsString()
  id: string;

  @IsEnum(SystemEventType)
  type: SystemEventType;

  @IsString()
  serviceName: string;

  @Type(() => Date)
  @IsDate()
  timestamp: Date;

  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity: 'info' | 'warning' | 'error' | 'critical';

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class AlertDto {
  @IsString()
  id: string;

  @IsEnum(AlertType)
  type: AlertType;

  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @IsString()
  serviceName: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @Type(() => Date)
  @IsDate()
  timestamp: Date;

  @IsBoolean()
  resolved: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  resolvedAt?: Date;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
