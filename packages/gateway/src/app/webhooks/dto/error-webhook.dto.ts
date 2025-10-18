import { IsString, IsNumber, IsOptional, IsBoolean, IsObject, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorSeverity, ErrorCategory } from '@orion/shared/errors';

/**
 * DTO for error webhook payload
 */
export class ErrorWebhookDto {
  @ApiProperty({ description: 'Error name/type' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Error message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Error code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'HTTP status code' })
  @IsNumber()
  statusCode: number;

  @ApiPropertyOptional({ enum: ErrorSeverity, description: 'Error severity level' })
  @IsOptional()
  @IsEnum(ErrorSeverity)
  severity?: ErrorSeverity;

  @ApiPropertyOptional({ enum: ErrorCategory, description: 'Error category' })
  @IsOptional()
  @IsEnum(ErrorCategory)
  category?: ErrorCategory;

  @ApiProperty({ description: 'Service where error occurred' })
  @IsString()
  service: string;

  @ApiPropertyOptional({ description: 'Whether error is operational' })
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;

  @ApiPropertyOptional({ description: 'Correlation ID' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'User ID if available' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Request path' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: 'HTTP method' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Stack trace' })
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiProperty({ description: 'Timestamp when error occurred' })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
