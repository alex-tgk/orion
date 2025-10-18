import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { APP_FILTER } from '@nestjs/core';
import { PortRegistryModule } from '@orion/shared';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { gatewayConfig } from './config/gateway.config';

// Services
import { RedisService } from './services/redis.service';
import { HealthService } from './services/health.service';
import { JwtCacheService } from './services/jwt-cache.service';
import { ProxyService } from './services/proxy.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { ServiceDiscoveryService } from './services/service-discovery.service';
import { WebSocketProxyService } from './services/websocket-proxy.service';
import { LoadBalancerService } from './services/load-balancer.service';
import { MetricsService } from './services/metrics.service';

// Middleware
import { LoggingMiddleware } from './middleware/logging.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { CorsMiddleware } from './middleware/cors.middleware';
import { RequestTransformMiddleware } from './middleware/request-transform.middleware';
import { ResponseTransformMiddleware } from './middleware/response-transform.middleware';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

// Controllers
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [gatewayConfig],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),

    // Port Registry
    PortRegistryModule,

    // HTTP Client
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),

    // Health Checks
    TerminusModule,
  ],
  controllers: [AppController, HealthController, MetricsController],
  providers: [
    AppService,

    // Core Services
    RedisService,
    HealthService,
    JwtCacheService,
    ProxyService,
    CircuitBreakerService,
    ServiceDiscoveryService,
    WebSocketProxyService,
    LoadBalancerService,
    MetricsService,

    // Middleware (as providers for DI)
    LoggingMiddleware,
    RateLimitMiddleware,
    AuthMiddleware,
    CorsMiddleware,
    RequestTransformMiddleware,
    ResponseTransformMiddleware,

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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorsMiddleware,
        LoggingMiddleware,
        RateLimitMiddleware,
        AuthMiddleware,
        RequestTransformMiddleware
      )
      .forRoutes('*');
  }
}
