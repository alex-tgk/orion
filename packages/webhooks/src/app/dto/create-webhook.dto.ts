import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUrl,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMinSize,
  IsObject,
  IsInt,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';

/**
 * DTO for creating a new webhook
 */
export class CreateWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL that will receive POST requests',
    example: 'https://api.example.com/webhooks/orion',
    maxLength: 2048,
  })
  @IsUrl({ require_tld: false }, { message: 'URL must be a valid HTTP/HTTPS URL' })
  @MaxLength(2048)
  url: string;

  @ApiProperty({
    description: 'List of event types to subscribe to',
    example: ['user.created', 'user.updated', 'order.completed'],
    minItems: 1,
    maxItems: 100,
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one event type is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 event types allowed' })
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description: 'Human-readable description of the webhook',
    example: 'Production webhook for user events',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom HTTP headers to include in webhook requests',
    example: { 'X-Custom-Auth': 'bearer token123' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds',
    example: 10000,
    minimum: 1000,
    maximum: 30000,
    default: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Number of retry attempts on failure',
    example: 3,
    minimum: 0,
    maximum: 5,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  retryAttempts?: number;

  @ApiPropertyOptional({
    description: 'Rate limit (requests per minute)',
    example: 60,
    minimum: 1,
    maximum: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Tags for organizing webhooks',
    example: ['production', 'user-service'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { environment: 'production', team: 'backend' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
