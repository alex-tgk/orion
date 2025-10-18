import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { SubscriptionManagerService } from '../services/subscription-manager.service';
import { EventStreamService } from '../services/event-stream.service';

export interface EventSubscription {
  events: string[];
  filters?: {
    service?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    timeRange?: {
      start: Date;
      end: Date;
    };
  };
}

/**
 * WebSocket Gateway for Admin Events
 *
 * Handles real-time event streaming and notifications.
 */
@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
export class AdminEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminEventsGateway.name);

  constructor(
    private readonly subscriptionManager: SubscriptionManagerService,
    private readonly eventStream: EventStreamService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Admin Events Gateway initialized');
    this.setupEventListeners();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to events: ${client.id}`);

    // Send initial connection acknowledgment
    client.emit('connected', {
      timestamp: new Date(),
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from events: ${client.id}`);
    this.subscriptionManager.removeAllSubscriptions(client.id);
  }

  /**
   * Subscribe to specific events
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() subscription: EventSubscription,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validate subscription
      if (!subscription.events || subscription.events.length === 0) {
        throw new WsException('No events specified for subscription');
      }

      // Add subscription
      this.subscriptionManager.addSubscription(client.id, 'events', subscription);

      // Join rooms for each event type
      subscription.events.forEach(event => {
        client.join(`event:${event}`);
      });

      // Send confirmation
      client.emit('subscription:confirmed', {
        events: subscription.events,
        filters: subscription.filters,
        timestamp: new Date(),
      });

      this.logger.log(`Client ${client.id} subscribed to events: ${subscription.events.join(', ')}`);

      // Send recent events if requested
      this.sendRecentEvents(client, subscription);

      return { success: true, subscribed: subscription.events };
    } catch (error) {
      this.logger.error(`Subscription error for client ${client.id}:`, error);
      throw new WsException(error.message);
    }
  }

  /**
   * Unsubscribe from events
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() events: string[],
    @ConnectedSocket() client: Socket,
  ) {
    events.forEach(event => {
      client.leave(`event:${event}`);
    });

    this.subscriptionManager.removeSubscription(client.id, 'events');

    client.emit('subscription:removed', {
      events,
      timestamp: new Date(),
    });

    return { success: true, unsubscribed: events };
  }

  /**
   * Get current subscriptions
   */
  @SubscribeMessage('get:subscriptions')
  handleGetSubscriptions(@ConnectedSocket() client: Socket) {
    const subscriptions = this.subscriptionManager.getSubscriptions(client.id);
    return { subscriptions };
  }

  /**
   * Broadcast event to subscribers
   */
  broadcastEvent(event: any) {
    const eventType = event.type || 'general';
    const room = `event:${eventType}`;

    // Broadcast to specific event room
    this.server.to(room).emit('event', event);

    // Also broadcast to 'all' room for clients subscribed to everything
    this.server.to('event:all').emit('event', event);

    this.logger.debug(`Broadcasted ${eventType} event to subscribers`);
  }

  /**
   * Send system notification
   */
  sendNotification(notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    metadata?: any;
  }) {
    this.server.emit('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Setup event listeners for internal events
   */
  private setupEventListeners() {
    // Listen for events from EventStreamService
    this.eventStream.on('event', (event) => {
      this.broadcastEvent(event);
    });

    // Listen for critical system events
    this.eventStream.on('critical', (event) => {
      this.sendNotification({
        type: 'error',
        title: 'Critical System Event',
        message: event.message,
        metadata: event,
      });
    });
  }

  /**
   * Send recent events to newly subscribed client
   */
  private async sendRecentEvents(client: Socket, subscription: EventSubscription) {
    try {
      const recentEvents = await this.eventStream.getRecentEvents({
        events: subscription.events,
        filters: subscription.filters,
        limit: 50,
      });

      if (recentEvents.length > 0) {
        client.emit('events:recent', recentEvents);
      }
    } catch (error) {
      this.logger.error('Failed to send recent events:', error);
    }
  }
}