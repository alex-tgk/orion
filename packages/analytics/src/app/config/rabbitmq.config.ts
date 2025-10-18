import { registerAs } from '@nestjs/config';

export interface RabbitMQConfig {
  url: string;
  exchanges: {
    events: string;
    deadLetter: string;
  };
  queues: {
    analytics: string;
    deadLetter: string;
  };
  prefetchCount: number;
}

export default registerAs(
  'rabbitmq',
  (): RabbitMQConfig => ({
    url: process.env.RABBITMQ_URL || 'amqp://orion:orion_dev_password@localhost:5672',
    exchanges: {
      events: process.env.RABBITMQ_EVENTS_EXCHANGE || 'orion.events',
      deadLetter: process.env.RABBITMQ_DLX_EXCHANGE || 'orion.dlx',
    },
    queues: {
      analytics: process.env.RABBITMQ_ANALYTICS_QUEUE || 'analytics.events',
      deadLetter: process.env.RABBITMQ_DLQ_QUEUE || 'analytics.dlq',
    },
    prefetchCount: parseInt(process.env.RABBITMQ_PREFETCH_COUNT || '10', 10),
  }),
);
