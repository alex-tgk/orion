import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsArray, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export class LogEntryDto {
  @ApiProperty({ description: 'Log entry ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Service name that generated the log' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'Log level', enum: LogLevel })
  @IsEnum(LogLevel)
  level: LogLevel;

  @ApiProperty({ description: 'Log message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Log timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Additional context data' })
  @IsOptional()
  context?: Record<string, unknown>;

  @ApiProperty({ description: 'Stack trace (for errors)' })
  @IsString()
  @IsOptional()
  stack?: string;
}

export class QueryLogsDto {
  @ApiPropertyOptional({ description: 'Filter by service name' })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional({ description: 'Filter by log level', enum: LogLevel })
  @IsEnum(LogLevel)
  @IsOptional()
  level?: LogLevel;

  @ApiPropertyOptional({ description: 'Start time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Search query for message content' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Number of results to return', minimum: 1, maximum: 1000 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 100;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export class LogListResponseDto {
  @ApiProperty({ description: 'List of log entries', type: [LogEntryDto] })
  @IsArray()
  logs: LogEntryDto[];

  @ApiProperty({ description: 'Total matching logs' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Number of logs returned' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Offset used' })
  @IsNumber()
  offset: number;

  @ApiProperty({ description: 'Query timestamp' })
  @IsString()
  timestamp: string;
}

export class ExportLogsDto {
  @ApiPropertyOptional({ description: 'Export format', enum: ['json', 'csv'] })
  @IsEnum(['json', 'csv'])
  @IsOptional()
  format?: 'json' | 'csv' = 'json';

  @ApiPropertyOptional({ description: 'Filter by service name' })
  @IsString()
  @IsOptional()
  service?: string;

  @ApiPropertyOptional({ description: 'Filter by log level', enum: LogLevel })
  @IsEnum(LogLevel)
  @IsOptional()
  level?: LogLevel;

  @ApiPropertyOptional({ description: 'Start time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}

export class ExportLogsResponseDto {
  @ApiProperty({ description: 'Export format' })
  @IsString()
  format: string;

  @ApiProperty({ description: 'Number of logs exported' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Export data (base64 encoded if binary)' })
  @IsString()
  data: string;

  @ApiProperty({ description: 'Filename suggestion' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'Export timestamp' })
  @IsString()
  timestamp: string;
}
