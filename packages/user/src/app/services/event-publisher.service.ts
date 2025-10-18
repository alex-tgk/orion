import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import {
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserVerifiedEvent,
  UserPreferencesUpdatedEvent,
  USER_EVENT_PATTERNS,
} from '@orion/shared';

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventPublisherService.name);
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange: string;
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>('rabbitmq.url')!;
    this.exchange = this.configService.get<string>('rabbitmq.exchange')!;
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      this.logger.log('Connected to RabbitMQ successfully');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      // Don't throw - allow service to start even if RabbitMQ is unavailable
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ', error);
    }
  }

  private async publish(routingKey: string, event: object): Promise<void> {
    if (!this.channel) {
      this.logger.warn(`Cannot publish event ${routingKey}: No RabbitMQ connection`);
      return;
    }

    try {
      const message = Buffer.from(JSON.stringify(event));
      this.channel.publish(this.exchange, routingKey, message, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });
      this.logger.debug(`Published event: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${routingKey}`, error);
    }
  }

  async publishUserCreated(userId: string, email: string, name: string): Promise<void> {
    const event: UserCreatedEvent = {
      eventId: uuidv4(),
      userId,
      email,
      name,
      createdAt: new Date(),
    };
    await this.publish(USER_EVENT_PATTERNS.USER_CREATED, event);
  }

  async publishUserUpdated(userId: string, changes: string[]): Promise<void> {
    const event: UserUpdatedEvent = {
      eventId: uuidv4(),
      userId,
      changes,
      updatedAt: new Date(),
    };
    await this.publish(USER_EVENT_PATTERNS.USER_UPDATED, event);
  }

  async publishUserDeleted(userId: string): Promise<void> {
    const event: UserDeletedEvent = {
      eventId: uuidv4(),
      userId,
      deletedAt: new Date(),
    };
    await this.publish(USER_EVENT_PATTERNS.USER_DELETED, event);
  }

  async publishUserVerified(userId: string, email: string): Promise<void> {
    const event: UserVerifiedEvent = {
      eventId: uuidv4(),
      userId,
      email,
      verifiedAt: new Date(),
    };
    await this.publish(USER_EVENT_PATTERNS.USER_VERIFIED, event);
  }

  async publishUserPreferencesUpdated(
    userId: string,
    preferences: UserPreferencesUpdatedEvent['preferences']
  ): Promise<void> {
    const event: UserPreferencesUpdatedEvent = {
      eventId: uuidv4(),
      userId,
      preferences,
      updatedAt: new Date(),
    };
    await this.publish(USER_EVENT_PATTERNS.USER_PREFERENCES_UPDATED, event);
  }
}
