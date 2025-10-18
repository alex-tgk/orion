import {
  Module,
  Global,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { Channel, Connection } from 'amqplib';
import { USER_EVENT_PATTERNS, AUTH_EVENT_PATTERNS } from '@orion/shared';

export const RABBITMQ_CONNECTION = 'RABBITMQ_CONNECTION';
export const RABBITMQ_CHANNEL = 'RABBITMQ_CHANNEL';

@Global()
@Module({
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: async (configService: ConfigService): Promise<Connection> => {
        const url = configService.get<string>('notification.rabbitmq.url');
        const logger = new Logger('RabbitMQ');

        try {
          logger.log(`Connecting to RabbitMQ at ${url}...`);
          const connection = await amqp.connect(url);

          connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', err);
          });

          connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
          });

          logger.log('RabbitMQ connection established');
          return connection;
        } catch (error) {
          logger.error('Failed to connect to RabbitMQ:', error);
          throw error;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: RABBITMQ_CHANNEL,
      useFactory: async (
        connection: Connection,
        configService: ConfigService,
      ): Promise<Channel> => {
        const logger = new Logger('RabbitMQ');
        const exchange = configService.get<string>(
          'notification.rabbitmq.exchange',
        );
        const prefetch = configService.get<number>(
          'notification.rabbitmq.prefetch',
        );

        try {
          const channel = await connection.createChannel();
          await channel.prefetch(prefetch);

          // Assert exchange
          await channel.assertExchange(exchange, 'topic', { durable: true });

          // Setup queues for user events
          const userQueue = 'notification.user-events';
          await channel.assertQueue(userQueue, { durable: true });
          await channel.bindQueue(
            userQueue,
            exchange,
            USER_EVENT_PATTERNS.USER_CREATED,
          );
          await channel.bindQueue(
            userQueue,
            exchange,
            USER_EVENT_PATTERNS.USER_VERIFIED,
          );
          await channel.bindQueue(
            userQueue,
            exchange,
            USER_EVENT_PATTERNS.USER_UPDATED,
          );
          await channel.bindQueue(
            userQueue,
            exchange,
            USER_EVENT_PATTERNS.USER_DELETED,
          );

          // Setup queues for auth events
          const authQueue = 'notification.auth-events';
          await channel.assertQueue(authQueue, { durable: true });
          await channel.bindQueue(
            authQueue,
            exchange,
            AUTH_EVENT_PATTERNS.PASSWORD_RESET_REQUESTED,
          );
          await channel.bindQueue(
            authQueue,
            exchange,
            AUTH_EVENT_PATTERNS.PASSWORD_CHANGED,
          );
          await channel.bindQueue(
            authQueue,
            exchange,
            AUTH_EVENT_PATTERNS.SUSPICIOUS_LOGIN,
          );

          // Setup dead letter queue
          const dlq = 'notification.dlq';
          await channel.assertQueue(dlq, { durable: true });

          logger.log('RabbitMQ queues and bindings configured');
          return channel;
        } catch (error) {
          logger.error('Failed to create RabbitMQ channel:', error);
          throw error;
        }
      },
      inject: [RABBITMQ_CONNECTION, ConfigService],
    },
  ],
  exports: [RABBITMQ_CONNECTION, RABBITMQ_CHANNEL],
})
export class RabbitMQModule implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQModule.name);

  constructor(
    private readonly connection: Connection,
    private readonly channel: Channel,
  ) {}

  async onModuleDestroy() {
    try {
      await this.channel.close();
      await this.connection.close();
      this.logger.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}
