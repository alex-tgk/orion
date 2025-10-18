import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import costTrackingConfig from './config/cost-tracking.config';
import { CostTrackingController } from './controllers/cost-tracking.controller';
import { CostTrackingService } from './services/cost-tracking.service';
import { KubernetesService } from './services/kubernetes.service';
import { DatabaseMetricsService } from './services/database-metrics.service';
import { CostCalculatorService } from './services/cost-calculator.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [costTrackingConfig],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [CostTrackingController],
  providers: [
    CostTrackingService,
    KubernetesService,
    DatabaseMetricsService,
    CostCalculatorService,
  ],
})
export class AppModule {}
