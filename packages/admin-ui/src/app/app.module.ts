import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';

// Controllers
import { AppController } from './app.controller';
import { HealthController } from './controllers/health.controller';
import { ServicesController } from './controllers/services.controller';
import { PM2Controller } from './controllers/pm2.controller';
import { LogsController } from './controllers/logs.controller';
import { QueuesController } from './controllers/queues.controller';
import { FeatureFlagsController } from './controllers/feature-flags.controller';
import { AIController } from './controllers/ai.controller';

// Services
import { HealthService } from './services/health.service';
import { ServicesService } from './services/services.service';
import { PM2Service } from './services/pm2.service';
import { LogsService } from './services/logs.service';
import { RabbitMQService } from './services/rabbitmq.service';
import { FeatureFlagsService } from './services/feature-flags.service';

// Gateways
import { AdminEventsGateway } from './gateways/admin-events.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [
    AppController,
    HealthController,
    ServicesController,
    PM2Controller,
    LogsController,
    QueuesController,
    FeatureFlagsController,
    AIController,
  ],
  providers: [
    // Core Services
    HealthService,
    ServicesService,
    PM2Service,
    LogsService,
    RabbitMQService,
    FeatureFlagsService,
    // WebSocket Gateway
    AdminEventsGateway,
  ],
})
export class AppModule {}
