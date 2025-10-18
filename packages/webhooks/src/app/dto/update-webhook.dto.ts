import { ApiPropertyOptional } from '@nestjs/swagger';
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
  IsEnum,
  ArrayMaxSize,
} from 'class-validator';
import { WebhookStatus } from '@prisma/client/webhooks';

/**
 * DTO for updating an existing webhook
 */
export class UpdateWebhookDto {
  @ApiPropertyOptional({
    description: 'Webhook endpoint URL',
    example: 'https://api.example.com/webhooks/orion',
    maxLength: 2048,
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional({
    description: 'List of event types to subscribe to',
    example: ['user.created', 'user.updated'],
    minItems: 1,
    maxItems: 100,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({
    description: 'Description of the webhook',
    example: 'Production webhook for user events',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Webhook status',
    enum: WebhookStatus,
    example: WebhookStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(WebhookStatus)
  status?: WebhookStatus;

  @ApiPropertyOptional({
    description: 'Custom HTTP headers',
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
    example: { environment: 'production' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
