import { Controller, Get, Post, Param, Query, Logger, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RabbitMQService } from '../services/rabbitmq.service';
import { QueueDto, QueueListResponseDto, QueueMessagesResponseDto, PurgeQueueResponseDto } from '../dto/queue.dto';

@ApiTags('Queues')
@Controller('queues')
export class QueuesController {
  private readonly logger = new Logger(QueuesController.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Get()
  @ApiOperation({ summary: 'List all RabbitMQ queues' })
  @ApiResponse({ status: 200, description: 'Queues retrieved successfully', type: QueueListResponseDto })
  async listQueues(): Promise<QueueListResponseDto> {
    return this.rabbitMQService.listQueues();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get queue details and statistics' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Queue details retrieved successfully', type: QueueDto })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async getQueue(@Param('name') name: string): Promise<QueueDto> {
    return this.rabbitMQService.getQueue(name);
  }

  @Get(':name/messages')
  @ApiOperation({ summary: 'Peek messages from queue without consuming them' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiQuery({ name: 'limit', description: 'Maximum number of messages to peek', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages peeked successfully', type: QueueMessagesResponseDto })
  async peekMessages(
    @Param('name') name: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<QueueMessagesResponseDto> {
    return this.rabbitMQService.peekMessages(name, limit || 10);
  }

  @Post(':name/purge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge all messages from a queue' })
  @ApiParam({ name: 'name', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Queue purged successfully', type: PurgeQueueResponseDto })
  async purgeQueue(@Param('name') name: string): Promise<PurgeQueueResponseDto> {
    const result = await this.rabbitMQService.purgeQueue(name);

    return {
      queueName: name,
      messagesPurged: result.messagesPurged,
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }
}
