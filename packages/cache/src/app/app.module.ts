import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import cacheConfig from './config/cache.config';
import { CacheController } from './cache.controller';
import { CacheService, StatsService, HealthService } from './services';
import { CacheInvalidationListener } from './listeners';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [cacheConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({
      // Use wildcards for event patterns
      wildcard: true,
      // Set delimiter for event names
      delimiter: '.',
      // Max listeners per event
      maxListeners: 10,
      // Show event emitter warnings
      verboseMemoryLeak: true,
    }),
  ],
  controllers: [CacheController],
  providers: [CacheService, StatsService, HealthService, CacheInvalidationListener],
  exports: [CacheService], // Export for potential use by other modules
})
export class AppModule {}
