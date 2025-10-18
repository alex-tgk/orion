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
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FlagCacheService } from '../services/flag-cache.service';

@WebSocketGateway({
  namespace: 'flags',
  cors: {
    origin: '*',
  },
})
export class FlagsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(FlagsGateway.name);
  private subscribedClients = new Map<string, Set<string>>(); // socketId -> Set of flag keys

  constructor(
    private readonly flagsService: FeatureFlagsService,
    private readonly cache: FlagCacheService,
  ) {}

  afterInit() {
    this.logger.log('Flags WebSocket Gateway initialized');

    // Subscribe to cache invalidation events
    this.cache.subscribeToInvalidations((flagKey) => {
      this.handleFlagUpdate(flagKey);
    });
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
    this.subscribedClients.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.subscribedClients.delete(client.id);
  }

  /**
   * Subscribe to flag updates
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, payload: { flags: string[] }) {
    const subscriptions = this.subscribedClients.get(client.id);
    if (!subscriptions) return;

    for (const flagKey of payload.flags) {
      subscriptions.add(flagKey);
      this.logger.debug(`Client ${client.id} subscribed to ${flagKey}`);

      // Send current flag state
      try {
        const flag = await this.flagsService.findByKey(flagKey);
        client.emit('flag:update', {
          key: flagKey,
          flag,
        });
      } catch (error) {
        client.emit('flag:error', {
          key: flagKey,
          error: 'Flag not found',
        });
      }
    }

    return { subscribed: payload.flags };
  }

  /**
   * Unsubscribe from flag updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(client: Socket, payload: { flags: string[] }) {
    const subscriptions = this.subscribedClients.get(client.id);
    if (!subscriptions) return;

    for (const flagKey of payload.flags) {
      subscriptions.delete(flagKey);
      this.logger.debug(`Client ${client.id} unsubscribed from ${flagKey}`);
    }

    return { unsubscribed: payload.flags };
  }

  /**
   * Get current flag state
   */
  @SubscribeMessage('get')
  async handleGet(_client: Socket, payload: { key: string }) {
    try {
      const flag = await this.flagsService.findByKey(payload.key);
      return { flag };
    } catch (error) {
      return { error: 'Flag not found' };
    }
  }

  /**
   * Evaluate flag for context
   */
  @SubscribeMessage('evaluate')
  async handleEvaluate(
    _client: Socket,
    payload: { key: string; context: any },
  ) {
    try {
      const result = await this.flagsService.evaluate(
        payload.key,
        payload.context,
      );
      return { result };
    } catch (error) {
      return { error: 'Evaluation failed' };
    }
  }

  /**
   * Handle flag updates and notify subscribed clients
   */
  private async handleFlagUpdate(flagKey: string) {
    this.logger.debug(`Flag updated: ${flagKey}`);

    try {
      const flag = await this.flagsService.findByKey(flagKey);

      // Notify all subscribed clients
      for (const [socketId, subscriptions] of this.subscribedClients) {
        if (subscriptions.has(flagKey)) {
          this.server.to(socketId).emit('flag:update', {
            key: flagKey,
            flag,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to fetch updated flag ${flagKey}:`, error);
    }
  }

  /**
   * Broadcast flag change to all connected clients
   */
  broadcastFlagChange(flagKey: string, action: string) {
    this.server.emit('flag:change', {
      key: flagKey,
      action,
      timestamp: new Date().toISOString(),
    });
  }
}
