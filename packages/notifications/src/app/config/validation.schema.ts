import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  NOTIFICATION_SERVICE_PORT: Joi.number().default(3003),

  NOTIFICATION_DATABASE_URL: Joi.string().required(),

  RABBITMQ_URL: Joi.string().default('amqp://orion:orion@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('orion.events'),
  RABBITMQ_PREFETCH: Joi.number().default(10),

  SENDGRID_API_KEY: Joi.string().when('SENDGRID_ENABLED', {
    is: Joi.not('false'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  SENDGRID_FROM_EMAIL: Joi.string().email().default('noreply@orion.com'),
  SENDGRID_FROM_NAME: Joi.string().default('ORION Platform'),
  SENDGRID_REPLY_TO: Joi.string().email().default('support@orion.com'),
  SENDGRID_ENABLED: Joi.string().default('true'),

  TWILIO_ACCOUNT_SID: Joi.string().when('TWILIO_ENABLED', {
    is: Joi.not('false'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  TWILIO_AUTH_TOKEN: Joi.string().when('TWILIO_ENABLED', {
    is: Joi.not('false'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  TWILIO_PHONE_NUMBER: Joi.string().when('TWILIO_ENABLED', {
    is: Joi.not('false'),
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  TWILIO_ENABLED: Joi.string().default('true'),

  FRONTEND_URL: Joi.string().uri().default('http://localhost:4200'),
  API_URL: Joi.string().uri().default('http://localhost:3000'),
});
