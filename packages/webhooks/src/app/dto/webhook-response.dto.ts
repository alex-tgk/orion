import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookStatus } from '@prisma/client/webhooks';

/**
 * DTO for webhook response
 */
export class WebhookResponseDto {
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this webhook',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://api.example.com/webhooks/orion',
  })
  url: string;

  @ApiProperty({
    description: 'Subscribed event types',
    example: ['user.created', 'user.updated'],
    type: [String],
  })
  events: string[];

  @ApiPropertyOptional({
    description: 'Webhook description',
    example: 'Production webhook for user events',
  })
  description?: string;

  @ApiProperty({
    description: 'Webhook status',
    enum: WebhookStatus,
    example: WebhookStatus.ACTIVE,
  })
  status: WebhookStatus;

  @ApiProperty({
    description: 'Whether webhook is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Total number of failures',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Consecutive failures',
    example: 0,
  })
  consecutiveFailures: number;

  @ApiPropertyOptional({
    description: 'Last failure timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  lastFailureAt?: Date;

  @ApiPropertyOptional({
    description: 'Last failure reason',
    example: 'Connection timeout',
  })
  lastFailureReason?: string;

  @ApiProperty({
    description: 'Total number of successful deliveries',
    example: 1234,
  })
  successCount: number;

  @ApiPropertyOptional({
    description: 'Last success timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  lastSuccessAt?: Date;

  @ApiPropertyOptional({
    description: 'Rate limit (requests per minute)',
    example: 60,
  })
  rateLimit?: number;

  @ApiProperty({
    description: 'Request timeout in milliseconds',
    example: 10000,
  })
  timeout: number;

  @ApiProperty({
    description: 'Number of retry attempts',
    example: 3,
  })
  retryAttempts: number;

  @ApiProperty({
    description: 'Custom headers (secrets masked)',
    example: { 'X-Custom-Auth': '***' },
  })
  headers: Record<string, string>;

  @ApiProperty({
    description: 'Tags',
    example: ['production', 'user-service'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Metadata',
    example: { environment: 'production' },
  })
  metadata: Record<string, unknown>;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO for paginated webhook list response
 */
export class WebhookListResponseDto {
  @ApiProperty({
    description: 'List of webhooks',
    type: [WebhookResponseDto],
  })
  webhooks: WebhookResponseDto[];

  @ApiProperty({
    description: 'Total count',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;
}
