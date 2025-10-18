import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { webhookConfig } from './config';
import { WebhooksController } from './webhooks.controller';
import {
  SignatureService,
  WebhookRepository,
  WebhookDeliveryService,
  WebhooksService,
  HealthService,
  EventConsumerService,
} from './services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [webhookConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhooksController],
  providers: [
    SignatureService,
    WebhookRepository,
    WebhookDeliveryService,
    WebhooksService,
    HealthService,
    EventConsumerService,
  ],
})
export class AppModule {}
