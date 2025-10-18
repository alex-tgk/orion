import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * WebSocket Gateway for System Health Widget
 *
 * Provides real-time health updates to connected clients
 */
@WebSocketGateway({
  namespace: 'widgets/system-health',
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
})
export class SystemHealthGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SystemHealthGateway.name);
  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Send welcome message
    client.emit('connected', {
      message: 'Connected to System Health Monitor',
      timestamp: new Date().toISOString(),
    });

    // Send current client count
    this.broadcastClientCount();
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.broadcastClientCount();
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} subscribed to health updates`);

    client.join('health-updates');

    return {
      event: 'subscribed',
      data: {
        success: true,
        message: 'Subscribed to health updates',
      },
    };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} unsubscribed from health updates`);

    client.leave('health-updates');

    return {
      event: 'unsubscribed',
      data: {
        success: true,
        message: 'Unsubscribed from health updates',
      },
    };
  }

  @SubscribeMessage('get-history')
  handleGetHistory(
    @MessageBody() data: { duration?: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} requested history`);

    // This would typically call the service to get historical data
    // For now, we'll just acknowledge the request
    return {
      event: 'history-response',
      data: {
        duration: data.duration || 60,
        // Historical data would be included here
      },
    };
  }

  /**
   * Broadcast health update to all subscribed clients
   */
  broadcastHealthUpdate(metrics: any) {
    this.server.to('health-updates').emit('health-update', {
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast alert to all connected clients
   */
  broadcastAlert(alert: any) {
    this.server.emit('health-alert', {
      alert,
      timestamp: new Date().toISOString(),
    });

    this.logger.warn(`Broadcast alert: ${alert.message}`);
  }

  /**
   * Broadcast client count
   */
  private broadcastClientCount() {
    this.server.emit('client-count', {
      count: this.connectedClients.size,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.connectedClients.size;
  }
}
