import { registerAs } from '@nestjs/config';

export default registerAs('notification', () => ({
  port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3003', 10),
  env: process.env.NODE_ENV || 'development',

  database: {
    url:
      process.env.NOTIFICATION_DATABASE_URL ||
      'postgresql://orion:orion@localhost:5432/orion_notification',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://orion:orion@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'orion.events',
    prefetch: parseInt(process.env.RABBITMQ_PREFETCH || '10', 10),
    retryDelay: [1000, 5000, 30000], // Exponential backoff: 1s, 5s, 30s
    maxAttempts: 3,
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@orion.com',
      name: process.env.SENDGRID_FROM_NAME || 'ORION Platform',
    },
    replyTo: process.env.SENDGRID_REPLY_TO || 'support@orion.com',
    enabled: process.env.SENDGRID_ENABLED !== 'false',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    from: process.env.TWILIO_PHONE_NUMBER || '',
    enabled: process.env.TWILIO_ENABLED !== 'false',
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
  },
}));
