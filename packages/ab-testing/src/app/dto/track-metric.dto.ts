import { IsString, IsNumber, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackMetricDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Metric key' })
  @IsString()
  metricKey: string;

  @ApiProperty({ description: 'Metric value' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class TrackConversionDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Conversion value (for revenue tracking)' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
