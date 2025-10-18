import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PortRegistryModule } from '@orion/shared';
import { StorageController, HealthController } from './storage.controller';
import { DatabaseService, S3Service, FileService, HealthService } from './services';
import { appConfig, s3Config, databaseConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, s3Config, databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
    PortRegistryModule,
  ],
  controllers: [StorageController, HealthController],
  providers: [DatabaseService, S3Service, FileService, HealthService],
  exports: [DatabaseService, S3Service, FileService],
})
export class AppModule {}
