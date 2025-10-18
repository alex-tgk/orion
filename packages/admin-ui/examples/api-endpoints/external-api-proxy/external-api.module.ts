import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ExternalApiController } from './external-api.controller';
import { ExternalApiService } from './external-api.service';

/**
 * External API Proxy Module
 *
 * Demonstrates how to create a proxy to external APIs with:
 * - Response caching
 * - Rate limiting
 * - Error handling
 * - Request transformation
 *
 * @example
 * // Add to app.module.ts:
 * import { ExternalApiModule } from './extensions/api-endpoints/external-api-proxy/external-api.module';
 *
 * @Module({
 *   imports: [ExternalApiModule],
 * })
 * export class AppModule {}
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // Maximum number of items in cache
    }),
  ],
  controllers: [ExternalApiController],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}
