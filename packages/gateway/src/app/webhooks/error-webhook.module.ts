import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ErrorWebhookController } from './error-webhook.controller';
import { ErrorWebhookService } from './error-webhook.service';
import { ErrorProcessorConsumer } from './error-processor.consumer';
import { ApiKeyGuard } from '../guards/api-key.guard';

/**
 * Module for error webhook handling
 */
@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'error-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [ErrorWebhookController],
  providers: [ErrorWebhookService, ErrorProcessorConsumer, ApiKeyGuard],
  exports: [ErrorWebhookService],
})
export class ErrorWebhookModule {}
