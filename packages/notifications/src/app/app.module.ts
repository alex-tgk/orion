import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@orion/shared';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { RabbitMQModule } from './config/rabbitmq.module';

// Controllers
import { NotificationsController } from './controllers/notifications.controller';
import { HealthController } from './controllers/health.controller';
import { TemplatesController } from './controllers/templates.controller';
import { PreferencesController } from './controllers/preferences.controller';

// Services
import { NotificationPrismaService } from './services/notification-prisma.service';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';
import { TemplateService } from './services/template.service';
import { PreferencesService } from './services/preferences.service';
import { RetryService } from './services/retry.service';
import { DeliveryTrackingService } from './services/delivery-tracking.service';
import { HealthService } from './services/health.service';

// Consumers
import { UserEventsConsumer } from './consumers/user-events.consumer';
import { AuthEventsConsumer } from './consumers/auth-events.consumer';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),

    // Database
    PrismaModule,

    // Message Queue
    RabbitMQModule,

    // Task Scheduling
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AppController,
    NotificationsController,
    HealthController,
    TemplatesController,
    PreferencesController,
  ],
  providers: [
    AppService,

    // Database
    NotificationPrismaService,

    // Core Services
    NotificationService,
    EmailService,
    SmsService,
    PushService,
    TemplateService,
    PreferencesService,
    RetryService,
    DeliveryTrackingService,
    HealthService,

    // Message Queue Consumers
    UserEventsConsumer,
    AuthEventsConsumer,

    // Global Exception Filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
