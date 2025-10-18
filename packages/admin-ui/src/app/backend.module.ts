import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PortRegistryModule } from '@orion/shared';

// Controllers
import { ServicesController } from './controllers/services.controller';
import { EventsController } from './controllers/events.controller';
import { SystemController } from './controllers/system.controller';

// Services
import { ObservabilityService } from './services/observability.service';
import { MetricsService } from './services/metrics.service';
import { EventsService } from './services/events.service';
import { StatsService } from './services/stats.service';
import { CacheService } from './services/cache.service';
import { ServiceDiscoveryService } from './services/service-discovery.service';
import { HealthAggregationService } from './services/health-aggregation.service';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';

/**
 * Admin UI Backend Module
 *
 * Production-ready NestJS module for the ORION admin-ui observability dashboard.
 * Provides comprehensive REST API endpoints for monitoring and managing microservices.
 *
 * ## REST API Endpoints (10 total):
 *
 * ### Services API (4 endpoints):
 * - GET /api/services - List all services
 * - GET /api/services/:name - Service details
 * - GET /api/services/:name/health - Health check
 * - GET /api/services/:name/metrics - Metrics
 *
 * ### Events API (3 endpoints):
 * - GET /api/events - Query events
 * - GET /api/events/recent - Recent events
 * - GET /api/events/critical - Critical events
 *
 * ### System API (3 endpoints):
 * - GET /api/system/status - System overview
 * - GET /api/system/stats - Statistics
 * - GET /api/system/health/summary - Health summary
 *
 * ## Services Layer:
 * - ServiceDiscoveryService: Find ORION services via PortRegistry
 * - HealthAggregationService: Poll health from all services
 * - EventsService: Track and query system events
 * - MetricsService: Collect service metrics
 * - CacheService: Redis + in-memory fallback caching
 * - ObservabilityService: Unified observability operations
 * - StatsService: System-wide statistics
 *
 * ## Features:
 * - Comprehensive unit test coverage (80%+)
 * - DTOs with class-validator validation
 * - OpenAPI/Swagger documentation
 * - Global exception handling with correlation IDs
 * - Graceful degradation (cache fallbacks)
 * - Structured logging
 */
@Module({
  imports: [PortRegistryModule],
  controllers: [ServicesController, EventsController, SystemController],
  providers: [
    // Core Services
    CacheService,
    ServiceDiscoveryService,
    HealthAggregationService,
    ObservabilityService,
    MetricsService,
    EventsService,
    StatsService,
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [
    CacheService,
    ServiceDiscoveryService,
    HealthAggregationService,
    ObservabilityService,
    MetricsService,
    EventsService,
    StatsService,
  ],
})
export class AdminUIBackendModule {}
