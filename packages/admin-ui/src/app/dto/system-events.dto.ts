import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';

export enum EventLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum EventCategory {
  SYSTEM = 'system',
  SERVICE = 'service',
  SECURITY = 'security',
  DEPLOYMENT = 'deployment',
  PERFORMANCE = 'performance',
  USER = 'user',
}

export class SystemEventDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({ enum: EventLevel, description: 'Event severity level' })
  level: EventLevel;

  @ApiProperty({ enum: EventCategory, description: 'Event category' })
  category: EventCategory;

  @ApiProperty({ description: 'Service that generated the event' })
  serviceName: string;

  @ApiProperty({ description: 'Event message' })
  message: string;

  @ApiProperty({ description: 'Event timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Additional event metadata', required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'User ID if applicable', required: false })
  userId?: string;

  @ApiProperty({ description: 'Request ID for tracing', required: false })
  requestId?: string;
}

export class EventsQueryDto {
  @ApiProperty({ required: false, default: 100, minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiProperty({ enum: EventLevel, required: false })
  @IsOptional()
  @IsEnum(EventLevel)
  level?: EventLevel;

  @ApiProperty({ enum: EventCategory, required: false })
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiProperty({ required: false, description: 'Start time for events (ISO string)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ required: false, description: 'End time for events (ISO string)' })
  @IsOptional()
  @IsString()
  endTime?: string;
}

export class EventsResponseDto {
  @ApiProperty({ type: [SystemEventDto], description: 'List of events' })
  events: SystemEventDto[];

  @ApiProperty({ description: 'Total number of events matching query' })
  total: number;

  @ApiProperty({ description: 'Number of events returned' })
  count: number;

  @ApiProperty({ description: 'Offset used in query' })
  offset: number;

  @ApiProperty({ description: 'Limit used in query' })
  limit: number;

  @ApiProperty({ description: 'Whether there are more events available' })
  hasMore: boolean;
}
