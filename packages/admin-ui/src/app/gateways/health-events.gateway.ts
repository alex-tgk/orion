import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { HealthAggregationService } from '../services/health-aggregation.service';
import { AlertService } from '../services/alert.service';
import { ServiceHealthUpdate, ServiceStatus } from '../dto/health.dto';

interface ClientSubscription {
  services: string[];
  interval?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*', // In production, configure properly
  },
  namespace: '/health',
})
export class HealthEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HealthEventsGateway.name);
  private readonly clientSubscriptions = new Map<string, ClientSubscription>();
  private readonly updateIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly healthAggregationService: HealthAggregationService,
    private readonly alertService: AlertService,
  ) {}

  afterInit() {
    this.logger.log('Health Events WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { message: 'Connected to health events' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.stopHealthUpdates(client.id);
    this.clientSubscriptions.delete(client.id);
  }

  @SubscribeMessage('health:subscribe')
  handleSubscribe(
    client: Socket,
    payload: { services?: string[]; interval?: number },
  ) {
    this.logger.log(`Client ${client.id} subscribed to health updates`);

    const subscription: ClientSubscription = {
      services: payload.services || [],
      interval: payload.interval || 5000, // Default 5 seconds
    };

    this.clientSubscriptions.set(client.id, subscription);

    // Stop existing interval if any
    this.stopHealthUpdates(client.id);

    // Start sending health updates
    this.startHealthUpdates(client, subscription);

    client.emit('health:subscribed', {
      services: subscription.services,
      interval: subscription.interval,
    });
  }

  @SubscribeMessage('health:unsubscribe')
  handleUnsubscribe(client: Socket) {
    this.logger.log(`Client ${client.id} unsubscribed from health updates`);
    this.stopHealthUpdates(client.id);
    this.clientSubscriptions.delete(client.id);

    client.emit('health:unsubscribed');
  }

  @SubscribeMessage('health:get-overview')
  async handleGetOverview(client: Socket) {
    const overview = await this.healthAggregationService.getSystemHealthOverview();
    client.emit('health:overview', overview);
  }

  @SubscribeMessage('health:get-dependencies')
  async handleGetDependencies(client: Socket) {
    const graph = await this.healthAggregationService.getServiceDependencyGraph();
    client.emit('health:dependencies', graph);
  }

  @SubscribeMessage('alerts:subscribe')
  handleAlertsSubscribe(client: Socket) {
    this.logger.log(`Client ${client.id} subscribed to alerts`);
    client.emit('alerts:subscribed');
  }

  /**
   * Broadcast health update to all connected clients
   */
  async broadcastHealthUpdate(serviceName: string, previousStatus?: ServiceStatus) {
    const health = await this.healthAggregationService.checkServiceHealth(serviceName);

    const update: ServiceHealthUpdate = {
      serviceName,
      status: health.status,
      timestamp: new Date().toISOString(),
      previousStatus,
      reason: health.error,
    };

    this.server.emit('health:update', update);
    this.logger.debug(`Broadcasted health update for ${serviceName}`);
  }

  /**
   * Broadcast alert to all connected clients
   */
  async broadcastAlert(alert: any) {
    this.server.emit('health:alert', alert);
    this.logger.debug(`Broadcasted alert: ${alert.id}`);
  }

  /**
   * Start sending periodic health updates to a client
   */
  private startHealthUpdates(client: Socket, subscription: ClientSubscription) {
    const interval = setInterval(async () => {
      try {
        let servicesHealth;

        if (subscription.services.length > 0) {
          // Get specific services
          servicesHealth = await Promise.all(
            subscription.services.map(name =>
              this.healthAggregationService.checkServiceHealth(name)
            )
          );
        } else {
          // Get all services
          servicesHealth = await this.healthAggregationService.checkAllServicesHealth();
        }

        client.emit('health:update:batch', {
          services: servicesHealth,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error sending health updates: ${message}`);
        client.emit('health:error', { message });
      }
    }, subscription.interval);

    this.updateIntervals.set(client.id, interval);
  }

  /**
   * Stop sending health updates to a client
   */
  private stopHealthUpdates(clientId: string) {
    const interval = this.updateIntervals.get(clientId);

    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(clientId);
      this.logger.debug(`Stopped health updates for client ${clientId}`);
    }
  }

  /**
   * Send system overview to all clients
   */
  async broadcastSystemOverview() {
    const overview = await this.healthAggregationService.getSystemHealthOverview();
    this.server.emit('health:system-overview', overview);
  }

  /**
   * Send alert counts to all clients
   */
  async broadcastAlertCounts() {
    const counts = await this.alertService.getAlertCounts();
    this.server.emit('alerts:counts', counts);
  }
}
