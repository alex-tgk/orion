import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExperimentsController } from './controllers/experiments.controller';
import { ABTestingService } from './services/ab-testing.service';
import { BucketingService } from './services/bucketing.service';
import { StatisticsService } from './services/statistics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [ExperimentsController],
  providers: [ABTestingService, BucketingService, StatisticsService],
  exports: [ABTestingService, BucketingService, StatisticsService],
})
export class ABTestingModule {}
