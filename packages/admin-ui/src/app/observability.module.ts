import { Module } from '@nestjs/common';
import { PortRegistryModule } from '@orion/shared';

// Controllers
import { ObservabilityController } from './controllers/observability.controller';
import { ServicesController } from './controllers/services.controller';
import { EventsController } from './controllers/events.controller';
import { SystemController } from './controllers/system.controller';

// Services
import { ObservabilityService } from './services/observability.service';
import { MetricsService } from './services/metrics.service';
import { EventsService } from './services/events.service';
import { StatsService } from './services/stats.service';
import { CacheService } from './services/cache.service';
import { HealthMonitorService } from './services/health-monitor.service';

/**
 * Observability Module
 *
 * Provides comprehensive monitoring, observability, and analytics capabilities
 * for the ORION microservices platform. This module aggregates health, metrics,
 * and events from all registered services.
 *
 * Features:
 * - Service discovery and health monitoring
 * - Metrics collection and aggregation
 * - Event logging and querying
 * - System-wide statistics
 * - Background health monitoring
 * - Caching layer (Redis with in-memory fallback)
 *
 * Controllers:
 * - ObservabilityController: Legacy combined endpoints
 * - ServicesController: Service-specific endpoints
 * - EventsController: Event management endpoints
 * - SystemController: System-wide overview endpoints
 *
 * Services:
 * - ObservabilityService: Core health and service discovery
 * - MetricsService: Metrics collection and aggregation
 * - EventsService: Event logging and querying
 * - StatsService: System statistics calculation
 * - CacheService: Caching layer with Redis/in-memory fallback
 * - HealthMonitorService: Background health monitoring
 */
@Module({
  imports: [PortRegistryModule],
  controllers: [
    ObservabilityController,
    ServicesController,
    EventsController,
    SystemController,
  ],
  providers: [
    CacheService,
    ObservabilityService,
    MetricsService,
    EventsService,
    StatsService,
    HealthMonitorService,
  ],
  exports: [
    CacheService,
    ObservabilityService,
    MetricsService,
    EventsService,
    StatsService,
    HealthMonitorService,
  ],
})
export class ObservabilityModule {}
