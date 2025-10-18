import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule, PortRegistryModule } from '@orion/shared';
import { secretsConfig } from './config';
import { SecretsController } from './secrets.controller';
import {
  EncryptionService,
  AuditService,
  AccessControlService,
  SecretsService,
  RotationService,
  HealthService,
} from './services';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [secretsConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    PortRegistryModule,
  ],
  controllers: [SecretsController],
  providers: [
    EncryptionService,
    AuditService,
    AccessControlService,
    SecretsService,
    RotationService,
    HealthService,
  ],
  exports: [
    EncryptionService,
    AuditService,
    AccessControlService,
    SecretsService,
    RotationService,
  ],
})
export class AppModule {}
