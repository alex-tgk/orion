import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { QueueDto, QueueListResponseDto, QueueMessagesResponseDto, QueueStatsDto } from '../dto/queue.dto';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');
  }

  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ on init: ${error.message}`);
      // Don't throw - allow graceful degradation
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      this.logger.log('Successfully connected to RabbitMQ');

      this.connection.on('error', (err) => {
        this.logger.error(`RabbitMQ connection error: ${err.message}`);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
      });
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      throw error;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connection || !this.channel) {
      await this.connect();
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }

  async listQueues(): Promise<QueueListResponseDto> {
    await this.ensureConnection();

    // Note: Direct queue listing via AMQP protocol is limited
    // This requires RabbitMQ Management API for full queue information
    // For now, we'll return a basic implementation

    this.logger.warn('Full queue listing requires RabbitMQ Management API');

    // Predefined ORION queues (from architecture)
    const knownQueues = [
      'analytics.events',
      'notifications.email',
      'notifications.sms',
      'ai.processing',
      'audit.logs',
      'webhooks.outbound',
    ];

    const queues: QueueDto[] = [];
    let totalMessages = 0;

    for (const queueName of knownQueues) {
      try {
        const queueInfo = await this.channel.checkQueue(queueName);
        const stats: QueueStatsDto = {
          messageCount: queueInfo.messageCount,
          consumerCount: queueInfo.consumerCount,
          messagesReady: queueInfo.messageCount,
          messagesUnacknowledged: 0,
        };

        queues.push({
          name: queueName,
          vhost: '/',
          durable: true,
          autoDelete: false,
          stats,
          state: 'running',
        });

        totalMessages += queueInfo.messageCount;
      } catch (error) {
        this.logger.debug(`Queue ${queueName} not found or inaccessible`);
      }
    }

    return {
      queues,
      total: queues.length,
      totalMessages,
      timestamp: new Date().toISOString(),
    };
  }

  async getQueue(name: string): Promise<QueueDto> {
    await this.ensureConnection();

    try {
      const queueInfo = await this.channel.checkQueue(name);

      const stats: QueueStatsDto = {
        messageCount: queueInfo.messageCount,
        consumerCount: queueInfo.consumerCount,
        messagesReady: queueInfo.messageCount,
        messagesUnacknowledged: 0,
      };

      return {
        name,
        vhost: '/',
        durable: true,
        autoDelete: false,
        stats,
        state: 'running',
      };
    } catch (error) {
      this.logger.error(`Failed to get queue info for ${name}: ${error.message}`);
      throw new Error(`Queue ${name} not found`);
    }
  }

  async peekMessages(queueName: string, limit: number = 10): Promise<QueueMessagesResponseDto> {
    await this.ensureConnection();

    try {
      const queueInfo = await this.channel.checkQueue(queueName);
      const messages = [];

      // Get messages without consuming them (using basic.get with noAck=false and then reject)
      for (let i = 0; i < Math.min(limit, queueInfo.messageCount); i++) {
        const msg = await this.channel.get(queueName, { noAck: false });

        if (msg) {
          const content = JSON.parse(msg.content.toString());

          messages.push({
            messageId: msg.properties.messageId,
            content,
            properties: msg.properties,
            fields: msg.fields,
          });

          // Reject the message to put it back in the queue
          this.channel.nack(msg, false, true);
        } else {
          break;
        }
      }

      return {
        queueName,
        messages,
        count: messages.length,
        totalInQueue: queueInfo.messageCount,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to peek messages from ${queueName}: ${error.message}`);
      throw new Error(`Failed to peek messages from queue ${queueName}`);
    }
  }

  async purgeQueue(queueName: string): Promise<{ messagesPurged: number; success: boolean; message: string }> {
    await this.ensureConnection();

    try {
      const result = await this.channel.purgeQueue(queueName);

      this.logger.log(`Purged ${result.messageCount} messages from queue ${queueName}`);

      return {
        messagesPurged: result.messageCount,
        success: true,
        message: `Successfully purged ${result.messageCount} messages`,
      };
    } catch (error) {
      this.logger.error(`Failed to purge queue ${queueName}: ${error.message}`);
      return {
        messagesPurged: 0,
        success: false,
        message: `Failed to purge queue: ${error.message}`,
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.connection || !this.channel) {
        return false;
      }

      // Try to check a queue as a health check
      await this.channel.checkQueue('analytics.events');
      return true;
    } catch (error) {
      return false;
    }
  }
}
