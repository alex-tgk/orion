import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule, PrismaModule } from '@orion/shared';
import { FeatureFlagsController } from './controllers/feature-flags.controller';
import { FeatureFlagsService } from './services/feature-flags.service';
import { FlagCacheService } from './services/flag-cache.service';
import { FlagEvaluationService } from './services/flag-evaluation.service';
import { FlagAuditService } from './services/flag-audit.service';
import { FlagsGateway } from './gateways/flags.gateway';
import { FeatureFlagGuard } from './guards/feature-flag.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SharedModule,
  ],
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsService,
    FlagCacheService,
    FlagEvaluationService,
    FlagAuditService,
    FlagsGateway,
    FeatureFlagGuard,
  ],
  exports: [
    FeatureFlagsService,
    FlagCacheService,
    FlagEvaluationService,
    FlagAuditService,
    FeatureFlagGuard,
  ],
})
export class FeatureFlagsModule {}
