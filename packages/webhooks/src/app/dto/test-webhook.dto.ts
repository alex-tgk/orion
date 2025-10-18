import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

/**
 * DTO for testing a webhook
 */
export class TestWebhookDto {
  @ApiPropertyOptional({
    description: 'Event type to simulate',
    example: 'webhook.test',
    default: 'webhook.test',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Test payload data',
    example: { test: true, message: 'This is a test webhook delivery' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

/**
 * Response for webhook test
 */
export class TestWebhookResponseDto {
  @ApiProperty({
    description: 'Test delivery ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  deliveryId: string;

  @ApiProperty({
    description: 'Test event ID',
    example: 'evt_test_123456',
  })
  eventId: string;

  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Status message',
    example: 'Test webhook delivered successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'HTTP response status',
    example: 200,
  })
  responseStatus?: number;

  @ApiPropertyOptional({
    description: 'Response time in milliseconds',
    example: 245,
  })
  responseTime?: number;

  @ApiPropertyOptional({
    description: 'Error message if failed',
    example: 'Connection refused',
  })
  error?: string;
}
