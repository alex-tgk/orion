import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { WebhookRepository } from './webhook.repository';
import { WebhookDeliveryService } from './webhook-delivery.service';

/**
 * Service for consuming platform events from RabbitMQ
 */
@Injectable()
export class EventConsumerService implements OnModuleInit {
  private readonly logger = new Logger(EventConsumerService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly repository: WebhookRepository,
    private readonly deliveryService: WebhookDeliveryService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  /**
   * Connect to RabbitMQ and start consuming events
   */
  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('webhook.rabbitmqUrl');
      const exchange = this.configService.get<string>('webhook.rabbitmqExchange');
      const queue = this.configService.get<string>('webhook.rabbitmqQueue');
      const routingKey = this.configService.get<string>('webhook.rabbitmqRoutingKey');

      this.logger.log(`Connecting to RabbitMQ: ${rabbitmqUrl}`);

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      // Assert queue
      await this.channel.assertQueue(queue, { durable: true });

      // Bind queue to exchange
      await this.channel.bindQueue(queue, exchange, routingKey);

      // Set prefetch to process one message at a time
      await this.channel.prefetch(10);

      this.logger.log(
        `Consuming events from queue: ${queue} with routing key: ${routingKey}`,
      );

      // Start consuming
      await this.channel.consume(
        queue,
        (msg) => {
          if (msg) {
            this.handleEvent(msg);
          }
        },
        { noAck: false },
      );

      this.logger.log('Event consumer started successfully');

      // Handle connection errors
      this.connection.on('error', (error) => {
        this.logger.error('RabbitMQ connection error:', error);
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed, attempting to reconnect...');
        setTimeout(() => this.connect(), 5000);
      });
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      // Retry connection after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Handle incoming event from RabbitMQ
   */
  private async handleEvent(msg: amqp.Message): Promise<void> {
    try {
      const content = msg.content.toString();
      const event = JSON.parse(content);

      const eventId = event.id || event.eventId || `evt_${Date.now()}`;
      const eventType = event.event || event.eventType || msg.fields.routingKey;
      const eventData = event.data || event;

      this.logger.debug(`Received event: ${eventType} (${eventId})`);

      // Check for duplicate events (idempotency)
      const isProcessed = await this.repository.isEventProcessed(eventId);
      if (isProcessed) {
        this.logger.debug(`Event ${eventId} already processed, skipping`);
        this.channel?.ack(msg);
        return;
      }

      // Find all active webhooks subscribed to this event type
      const webhooks = await this.repository.findActiveWebhooksByEvent(eventType);

      if (webhooks.length === 0) {
        this.logger.debug(`No webhooks subscribed to event type: ${eventType}`);
        this.channel?.ack(msg);
        return;
      }

      this.logger.log(
        `Delivering event ${eventType} to ${webhooks.length} webhook(s)`,
      );

      // Queue deliveries for all matching webhooks
      const deliveryPromises = webhooks.map((webhook) =>
        this.deliveryService.queueDelivery(
          webhook,
          eventId,
          eventType,
          eventData,
        ),
      );

      await Promise.allSettled(deliveryPromises);

      // Acknowledge message
      this.channel?.ack(msg);
    } catch (error) {
      this.logger.error('Error processing event:', error);
      // Reject message and requeue
      this.channel?.nack(msg, false, true);
    }
  }

  /**
   * Close connections on shutdown
   */
  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('Event consumer stopped');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connections:', error);
    }
  }
}
