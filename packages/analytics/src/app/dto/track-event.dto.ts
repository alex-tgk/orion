import { IsString, IsOptional, IsEnum, IsObject, IsArray, IsBoolean, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum EventType {
  USER_ACTION = 'USER_ACTION',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  BUSINESS_METRIC = 'BUSINESS_METRIC',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR',
  CUSTOM = 'CUSTOM',
}

/**
 * DTO for tracking custom events
 */
export class TrackEventDto {
  @IsString()
  eventName!: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType = EventType.USER_ACTION;

  @IsString()
  @IsOptional()
  category?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsObject()
  @IsOptional()
  properties?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsBoolean()
  @IsOptional()
  success?: boolean = true;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

/**
 * Response DTO for tracked event
 */
export class EventResponseDto {
  id!: string;
  eventName!: string;
  eventType!: EventType;
  timestamp!: Date;
  success!: boolean;
}

/**
 * DTO for bulk event tracking
 */
export class BulkTrackEventDto {
  @IsArray()
  @Type(() => TrackEventDto)
  events!: TrackEventDto[];
}
