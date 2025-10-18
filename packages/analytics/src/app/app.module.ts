import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortRegistryModule } from '@orion/shared';
import {
  appConfig,
  databaseConfig,
  rabbitmqConfig,
  redisConfig,
} from './config';
import {
  PrismaService,
  EventService,
  MetricService,
  AggregationService,
  UserAnalyticsService,
  DashboardService,
  HealthService,
} from './services';
import { AnalyticsController } from './controllers/analytics.controller';
import { EventConsumer } from './consumers/event.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, rabbitmqConfig, redisConfig],
    }),
    PortRegistryModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    // Database
    PrismaService,

    // Services
    EventService,
    MetricService,
    AggregationService,
    UserAnalyticsService,
    DashboardService,
    HealthService,

    // Consumers
    EventConsumer,
  ],
  exports: [
    PrismaService,
    EventService,
    MetricService,
    AggregationService,
    UserAnalyticsService,
    DashboardService,
  ],
})
export class AppModule {}
