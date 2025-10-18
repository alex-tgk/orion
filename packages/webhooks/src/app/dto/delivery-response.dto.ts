import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client/webhooks';

/**
 * DTO for webhook delivery response
 */
export class DeliveryResponseDto {
  @ApiProperty({
    description: 'Unique delivery identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Webhook ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  webhookId: string;

  @ApiProperty({
    description: 'Event ID',
    example: 'evt_123456789',
  })
  eventId: string;

  @ApiProperty({
    description: 'Event type',
    example: 'user.created',
  })
  eventType: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  eventTimestamp: Date;

  @ApiProperty({
    description: 'Event payload',
    example: { id: '123', email: 'user@example.com' },
  })
  payload: Record<string, unknown>;

  @ApiProperty({
    description: 'HMAC signature',
    example: 'sha256=abc123...',
  })
  signature: string;

  @ApiProperty({
    description: 'Delivery status',
    enum: DeliveryStatus,
    example: DeliveryStatus.DELIVERED,
  })
  status: DeliveryStatus;

  @ApiProperty({
    description: 'Number of delivery attempts',
    example: 2,
  })
  attempts: number;

  @ApiProperty({
    description: 'Maximum attempts allowed',
    example: 3,
  })
  maxAttempts: number;

  @ApiPropertyOptional({
    description: 'HTTP response status code',
    example: 200,
  })
  responseStatus?: number;

  @ApiPropertyOptional({
    description: 'Response body',
    example: '{"success": true}',
  })
  responseBody?: string;

  @ApiPropertyOptional({
    description: 'Response time in milliseconds',
    example: 245,
  })
  responseTime?: number;

  @ApiPropertyOptional({
    description: 'Error message if failed',
    example: 'Connection timeout',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Next retry timestamp',
    example: '2025-10-18T12:05:00.000Z',
  })
  nextRetryAt?: Date;

  @ApiPropertyOptional({
    description: 'Last attempt timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  lastAttemptAt?: Date;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Delivery completion timestamp',
    example: '2025-10-18T12:00:00.000Z',
  })
  deliveredAt?: Date;
}

/**
 * DTO for paginated delivery list response
 */
export class DeliveryListResponseDto {
  @ApiProperty({
    description: 'List of deliveries',
    type: [DeliveryResponseDto],
  })
  deliveries: DeliveryResponseDto[];

  @ApiProperty({
    description: 'Total count',
    example: 150,
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
