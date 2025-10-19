import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsObject } from 'class-validator';

export class QueueMessageDto {
  @ApiProperty({ description: 'Message ID (if available)' })
  @IsString()
  @IsOptional()
  messageId?: string;

  @ApiProperty({ description: 'Message content' })
  @IsObject()
  content: Record<string, unknown>;

  @ApiProperty({ description: 'Message properties' })
  @IsObject()
  @IsOptional()
  properties?: {
    contentType?: string;
    contentEncoding?: string;
    deliveryMode?: number;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    timestamp?: number;
  };

  @ApiProperty({ description: 'Message fields' })
  @IsObject()
  @IsOptional()
  fields?: {
    deliveryTag?: number;
    redelivered?: boolean;
    exchange?: string;
    routingKey?: string;
  };
}

export class QueueStatsDto {
  @ApiProperty({ description: 'Total messages in queue' })
  @IsNumber()
  messageCount: number;

  @ApiProperty({ description: 'Number of consumers' })
  @IsNumber()
  consumerCount: number;

  @ApiProperty({ description: 'Messages ready to be delivered' })
  @IsNumber()
  @IsOptional()
  messagesReady?: number;

  @ApiProperty({ description: 'Messages unacknowledged' })
  @IsNumber()
  @IsOptional()
  messagesUnacknowledged?: number;

  @ApiProperty({ description: 'Publish rate (messages/sec)' })
  @IsNumber()
  @IsOptional()
  publishRate?: number;

  @ApiProperty({ description: 'Delivery rate (messages/sec)' })
  @IsNumber()
  @IsOptional()
  deliveryRate?: number;
}

export class QueueDto {
  @ApiProperty({ description: 'Queue name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Queue vhost' })
  @IsString()
  vhost: string;

  @ApiProperty({ description: 'Is queue durable' })
  @IsBoolean()
  durable: boolean;

  @ApiProperty({ description: 'Is queue auto-delete' })
  @IsBoolean()
  autoDelete: boolean;

  @ApiProperty({ description: 'Queue arguments' })
  @IsObject()
  @IsOptional()
  arguments?: Record<string, unknown>;

  @ApiProperty({ description: 'Queue statistics' })
  stats: QueueStatsDto;

  @ApiProperty({ description: 'Queue state' })
  @IsString()
  @IsOptional()
  state?: string;
}

export class QueueListResponseDto {
  @ApiProperty({ description: 'List of queues', type: [QueueDto] })
  @IsArray()
  queues: QueueDto[];

  @ApiProperty({ description: 'Total queue count' })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Total messages across all queues' })
  @IsNumber()
  totalMessages: number;

  @ApiProperty({ description: 'Timestamp of query' })
  @IsString()
  timestamp: string;
}

export class QueueMessagesResponseDto {
  @ApiProperty({ description: 'Queue name' })
  @IsString()
  queueName: string;

  @ApiProperty({ description: 'Messages peeked from queue', type: [QueueMessageDto] })
  @IsArray()
  messages: QueueMessageDto[];

  @ApiProperty({ description: 'Number of messages returned' })
  @IsNumber()
  count: number;

  @ApiProperty({ description: 'Total messages in queue' })
  @IsNumber()
  totalInQueue: number;

  @ApiProperty({ description: 'Timestamp of peek operation' })
  @IsString()
  timestamp: string;
}

export class PurgeQueueResponseDto {
  @ApiProperty({ description: 'Queue name' })
  @IsString()
  queueName: string;

  @ApiProperty({ description: 'Number of messages purged' })
  @IsNumber()
  messagesPurged: number;

  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Result message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Timestamp of purge operation' })
  @IsString()
  timestamp: string;
}
