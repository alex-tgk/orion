import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { HealthAggregationService, SystemHealth, HealthCheckResult } from '../services/health-aggregation.service';
import { SubscriptionManagerService } from '../services/subscription-manager.service';

/**
 * WebSocket Gateway for Service Health Monitoring
 *
 * Provides real-time health status updates for all microservices.
 */
@WebSocketGateway({
  namespace: '/health',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class ServiceHealthGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ServiceHealthGateway.name);
  private healthUpdateInterval: NodeJS.Timer | null = null;

  constructor(
    private readonly healthService: HealthAggregationService,
    private readonly subscriptionManager: SubscriptionManagerService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Service Health Gateway initialized');
    this.startHealthBroadcast();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to health monitoring: ${client.id}`);

    // Send current health status immediately
    const currentHealth = this.healthService.getCurrentHealth();
    if (currentHealth) {
      client.emit('health:current', currentHealth);
    }

    client.emit('connected', {
      timestamp: new Date(),
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from health monitoring: ${client.id}`);
    this.subscriptionManager.removeAllSubscriptions(client.id);
  }

  /**
   * Subscribe to health updates for specific services
   */
  @SubscribeMessage('subscribe:services')
  handleSubscribeServices(
    @MessageBody() services: string[],
    @ConnectedSocket() client: Socket,
  ) {
    // Join rooms for specific services
    services.forEach(service => {
      client.join(`health:service:${service}`);
    });

    this.subscriptionManager.addSubscription(client.id, 'health:services', { services });

    client.emit('subscription:confirmed', {
      type: 'services',
      services,
      timestamp: new Date(),
    });

    // Send current health for subscribed services
    this.sendServiceHealth(client, services);

    return { success: true, subscribedServices: services };
  }

  /**
   * Subscribe to overall system health
   */
  @SubscribeMessage('subscribe:system')
  handleSubscribeSystem(@ConnectedSocket() client: Socket) {
    client.join('health:system');
    this.subscriptionManager.addSubscription(client.id, 'health:system', {});

    const currentHealth = this.healthService.getCurrentHealth();
    if (currentHealth) {
      client.emit('health:system', currentHealth);
    }

    return { success: true, subscribed: 'system' };
  }

  /**
   * Get health history for a service
   */
  @SubscribeMessage('get:history')
  async handleGetHistory(
    @MessageBody() data: { service: string; duration?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const history = await this.healthService.getServiceHealthHistory(
      data.service,
      data.duration
    );

    client.emit('health:history', {
      service: data.service,
      history,
      timestamp: new Date(),
    });

    return { success: true, historyLength: history.length };
  }

  /**
   * Trigger manual health check
   */
  @SubscribeMessage('check:health')
  async handleCheckHealth(@ConnectedSocket() client: Socket) {
    this.logger.log(`Manual health check triggered by client ${client.id}`);

    const health = await this.healthService.checkSystemHealth();

    // Broadcast updated health to all clients
    this.broadcastSystemHealth(health);

    return { success: true, health };
  }

  /**
   * Listen for health updates from the health service
   */
  @OnEvent('health.updated')
  handleHealthUpdate(health: SystemHealth) {
    this.broadcastSystemHealth(health);
    this.broadcastServiceHealth(health.services);
  }

  /**
   * Broadcast system health to all subscribers
   */
  private broadcastSystemHealth(health: SystemHealth) {
    this.server.to('health:system').emit('health:system', health);

    // Send alerts for critical health
    if (health.overall === 'critical') {
      this.server.emit('health:alert', {
        severity: 'critical',
        message: `System health is critical: ${health.summary.unhealthy} services are down`,
        timestamp: health.timestamp,
        details: health.summary,
      });
    } else if (health.overall === 'degraded') {
      this.server.emit('health:alert', {
        severity: 'warning',
        message: `System health is degraded: ${health.summary.unhealthy + health.summary.degraded} services affected`,
        timestamp: health.timestamp,
        details: health.summary,
      });
    }
  }

  /**
   * Broadcast individual service health updates
   */
  private broadcastServiceHealth(services: HealthCheckResult[]) {
    services.forEach(service => {
      const room = `health:service:${service.service}`;
      this.server.to(room).emit('health:service', service);

      // Send alert for unhealthy services
      if (service.status === 'unhealthy') {
        this.server.to(room).emit('health:service:alert', {
          service: service.service,
          status: service.status,
          error: service.error,
          timestamp: service.timestamp,
        });
      }
    });
  }

  /**
   * Send current health status for specific services
   */
  private async sendServiceHealth(client: Socket, services: string[]) {
    const currentHealth = this.healthService.getCurrentHealth();
    if (!currentHealth) return;

    const serviceHealth = currentHealth.services.filter(s =>
      services.includes(s.service)
    );

    if (serviceHealth.length > 0) {
      client.emit('health:services', serviceHealth);
    }
  }

  /**
   * Start periodic health broadcast
   */
  private startHealthBroadcast() {
    // Broadcast health updates every 30 seconds
    this.healthUpdateInterval = setInterval(async () => {
      const health = await this.healthService.checkSystemHealth();
      this.broadcastSystemHealth(health);
    }, 30000);
  }

  /**
   * Clean up on gateway destroy
   */
  onModuleDestroy() {
    if (this.healthUpdateInterval) {
      clearInterval(this.healthUpdateInterval);
    }
  }
}