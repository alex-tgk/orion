import { registerAs } from '@nestjs/config';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  queuePrefix: string;
  durable: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export default registerAs(
  'rabbitmq',
  (): RabbitMQConfig => ({
    url: process.env.RABBITMQ_URL || 'amqp://orion:orion_rabbitmq_password@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'orion.events',
    queuePrefix: process.env.RABBITMQ_QUEUE_PREFIX || 'user-service',
    durable: process.env.RABBITMQ_DURABLE !== 'false',
    retryAttempts: parseInt(process.env.RABBITMQ_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.RABBITMQ_RETRY_DELAY || '1000', 10),
  }),
);
