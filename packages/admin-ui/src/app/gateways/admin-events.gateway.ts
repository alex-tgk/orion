import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server } from 'socket.io';
import { WsJwtGuard, AuthenticatedSocket } from '../guards/ws-jwt.guard';
import { SubscriptionManagerService } from '../services/subscription-manager.service';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  EventFilters,
  AlertFilters,
  TimeRange,
} from '../types/websocket-events.types';
import {
  SubscribeServiceHealthDto,
  SubscribeSystemEventsDto,
  SubscribeMetricsDto,
  SubscribeAlertsDto,
  RequestMetricsDto,
  ResolveAlertDto,
} from '../dto/websocket-events.dto';

/**
 * WebSocket Gateway for Admin UI Real-time Updates
 * Handles all real-time communication between backend and admin dashboard
 */
@WebSocketGateway({
  namespace: 'admin',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class AdminEventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AdminEventsGateway.name);

  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(private readonly subscriptionManager: SubscriptionManagerService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.logger.log(`Listening on namespace: /admin`);
  }

  async handleConnection(client: AuthenticatedSocket) {
    const user = client.user;
    this.logger.log(`Client connected: ${client.id} (User: ${user.email})`);

    // Send authentication confirmation
    client.emit('connection:authenticated', user.id);

    // Send subscription statistics
    const stats = this.subscriptionManager.getStats();
    this.logger.debug(`Connection stats: ${stats.totalClients} clients, ${stats.totalSubscriptions} subscriptions`);
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.subscriptionManager.unsubscribeAll(client.id);
  }

  // ============================================================================
  // SERVICE HEALTH SUBSCRIPTIONS
  // ============================================================================

  @SubscribeMessage('subscribe:service-health')
  handleSubscribeServiceHealth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeServiceHealthDto,
  ) {
    this.subscriptionManager.subscribe(client.id, {
      type: 'service-health',
      serviceName: data.serviceName,
    });

    client.emit('subscription:confirmed', {
      type: 'service-health',
      serviceName: data.serviceName,
    });

    this.logger.debug(
      `Client ${client.id} subscribed to service health${data.serviceName ? `: ${data.serviceName}` : ' (all services)'}`,
    );
  }

  @SubscribeMessage('unsubscribe:service-health')
  handleUnsubscribeServiceHealth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeServiceHealthDto,
  ) {
    this.subscriptionManager.unsubscribe(client.id, 'service-health', data.serviceName);

    client.emit('subscription:removed', {
      type: 'service-health',
      serviceName: data.serviceName,
    });
  }

  @SubscribeMessage('request:service-health')
  async handleRequestServiceHealth(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeServiceHealthDto,
  ) {
    // This will be implemented to fetch current state from port registry
    // For now, emit placeholder
    this.logger.debug(`Service health requested by ${client.id} for ${data.serviceName || 'all services'}`);
  }

  // ============================================================================
  // SYSTEM EVENTS SUBSCRIPTIONS
  // ============================================================================

  @SubscribeMessage('subscribe:system-events')
  handleSubscribeSystemEvents(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeSystemEventsDto,
  ) {
    this.subscriptionManager.subscribe(client.id, {
      type: 'system-events',
      filters: data.filters,
    });

    client.emit('subscription:confirmed', {
      type: 'system-events',
      filters: data.filters,
    });

    this.logger.debug(`Client ${client.id} subscribed to system events`);
  }

  @SubscribeMessage('unsubscribe:system-events')
  handleUnsubscribeSystemEvents(@ConnectedSocket() client: AuthenticatedSocket) {
    this.subscriptionManager.unsubscribe(client.id, 'system-events');

    client.emit('subscription:removed', {
      type: 'system-events',
    });
  }

  @SubscribeMessage('request:system-events')
  async handleRequestSystemEvents(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeSystemEventsDto,
  ) {
    this.logger.debug(`System events requested by ${client.id}`);
    // Implementation will fetch from event store
  }

  // ============================================================================
  // METRICS SUBSCRIPTIONS
  // ============================================================================

  @SubscribeMessage('subscribe:metrics')
  handleSubscribeMetrics(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeMetricsDto,
  ) {
    this.subscriptionManager.subscribe(client.id, {
      type: 'metrics',
      serviceName: data.serviceName,
    });

    client.emit('subscription:confirmed', {
      type: 'metrics',
      serviceName: data.serviceName,
    });

    this.logger.debug(
      `Client ${client.id} subscribed to metrics${data.serviceName ? `: ${data.serviceName}` : ' (all services)'}`,
    );
  }

  @SubscribeMessage('unsubscribe:metrics')
  handleUnsubscribeMetrics(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeMetricsDto,
  ) {
    this.subscriptionManager.unsubscribe(client.id, 'metrics', data.serviceName);

    client.emit('subscription:removed', {
      type: 'metrics',
      serviceName: data.serviceName,
    });
  }

  @SubscribeMessage('request:metrics')
  async handleRequestMetrics(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: RequestMetricsDto,
  ) {
    this.logger.debug(
      `Metrics requested by ${client.id} for ${data.serviceName}`,
    );
    // Implementation will fetch from metrics store
  }

  // ============================================================================
  // ALERTS SUBSCRIPTIONS
  // ============================================================================

  @SubscribeMessage('subscribe:alerts')
  handleSubscribeAlerts(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeAlertsDto,
  ) {
    this.subscriptionManager.subscribe(client.id, {
      type: 'alerts',
      filters: data.filters,
    });

    client.emit('subscription:confirmed', {
      type: 'alerts',
      filters: data.filters,
    });

    this.logger.debug(`Client ${client.id} subscribed to alerts`);
  }

  @SubscribeMessage('unsubscribe:alerts')
  handleUnsubscribeAlerts(@ConnectedSocket() client: AuthenticatedSocket) {
    this.subscriptionManager.unsubscribe(client.id, 'alerts');

    client.emit('subscription:removed', {
      type: 'alerts',
    });
  }

  @SubscribeMessage('request:alerts')
  async handleRequestAlerts(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubscribeAlertsDto,
  ) {
    this.logger.debug(`Alerts requested by ${client.id}`);
    // Implementation will fetch from alert store
  }

  @SubscribeMessage('resolve-alert')
  async handleResolveAlert(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ResolveAlertDto,
  ) {
    this.logger.log(`Alert ${data.alertId} resolved by user ${client.user.id}`);
    // Implementation will update alert in store and broadcast
  }

  // ============================================================================
  // PUBLIC METHODS FOR BROADCASTING EVENTS
  // ============================================================================

  /**
   * Broadcast service health update to subscribed clients
   */
  broadcastServiceHealth(serviceName: string, data: any) {
    const subscribers = this.subscriptionManager.getServiceHealthSubscribers(serviceName);
    subscribers.forEach((clientId) => {
      this.server.to(clientId).emit('service-health:update', data);
    });
  }

  /**
   * Broadcast system event to subscribed clients
   */
  broadcastSystemEvent(event: any) {
    const subscribers = this.subscriptionManager.getSystemEventSubscribers();
    subscribers.forEach((clientId) => {
      this.server.to(clientId).emit('system-event', event);
    });
  }

  /**
   * Broadcast metrics update to subscribed clients
   */
  broadcastMetrics(serviceName: string, metrics: any) {
    const subscribers = this.subscriptionManager.getMetricsSubscribers(serviceName);
    subscribers.forEach((clientId) => {
      this.server.to(clientId).emit('metrics:update', metrics);
    });
  }

  /**
   * Broadcast new alert to subscribed clients
   */
  broadcastAlert(alert: any) {
    const subscribers = this.subscriptionManager.getAlertSubscribers();
    subscribers.forEach((clientId) => {
      this.server.to(clientId).emit('alert:new', alert);
    });
  }

  /**
   * Broadcast alert resolution to subscribed clients
   */
  broadcastAlertResolved(alertId: string) {
    const subscribers = this.subscriptionManager.getAlertSubscribers();
    subscribers.forEach((clientId) => {
      this.server.to(clientId).emit('alert:resolved', alertId);
    });
  }

  /**
   * Get current gateway statistics
   */
  getStats() {
    return {
      connectedClients: this.server.sockets.size,
      subscriptions: this.subscriptionManager.getStats(),
    };
  }
}
