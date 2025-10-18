import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// Gateways
import { AdminEventsGateway } from './gateways/admin-events.gateway';
import { MetricsGateway } from './gateways/metrics.gateway';
import { ServiceHealthGateway } from './gateways/service-health.gateway';
import { LogsGateway } from './gateways/logs.gateway';
import { UserActivityGateway } from './gateways/user-activity.gateway';

// Services
import { WebSocketService } from './services/websocket.service';
import { SubscriptionManagerService } from './services/subscription-manager.service';
import { RealtimeMetricsService } from './services/realtime-metrics.service';
import { EventStreamService } from './services/event-stream.service';

// Guards
import { WsJwtGuard } from './guards/ws-jwt.guard';

/**
 * WebSocket Module for Real-time Communication
 *
 * Provides WebSocket gateways and services for real-time updates including:
 * - Service health monitoring
 * - Metrics streaming
 * - Event notifications
 * - Log streaming
 * - User activity tracking
 */
@Module({
  imports: [JwtModule],
  providers: [
    // Gateways
    AdminEventsGateway,
    MetricsGateway,
    ServiceHealthGateway,
    LogsGateway,
    UserActivityGateway,

    // Services
    WebSocketService,
    SubscriptionManagerService,
    RealtimeMetricsService,
    EventStreamService,

    // Guards
    WsJwtGuard,
  ],
  exports: [
    WebSocketService,
    SubscriptionManagerService,
    RealtimeMetricsService,
    EventStreamService,
  ],
})
export class WebSocketModule {}