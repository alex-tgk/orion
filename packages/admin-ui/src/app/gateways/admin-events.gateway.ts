import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ServicesService } from '../services/services.service';
import { HealthService } from '../services/health.service';
import { LogsService } from '../services/logs.service';
import { RabbitMQService } from '../services/rabbitmq.service';
import { PM2Service } from '../services/pm2.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
  namespace: '/admin',
})
export class AdminEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminEventsGateway.name);
  private healthCheckInterval: NodeJS.Timeout;
  private queueStatsInterval: NodeJS.Timeout;
  private pm2UpdateInterval: NodeJS.Timeout;
  private logStreamInterval: NodeJS.Timeout;

  constructor(
    private readonly servicesService: ServicesService,
    private readonly healthService: HealthService,
    private readonly logsService: LogsService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly pm2Service: PM2Service,
  ) {}

  afterInit(_: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Start periodic health checks (every 10 seconds)
    this.healthCheckInterval = setInterval(() => {
      this.broadcastServiceHealth();
    }, 10000);

    // Start queue stats broadcast (every 5 seconds)
    this.queueStatsInterval = setInterval(() => {
      this.broadcastQueueStats();
    }, 5000);

    // Start PM2 updates (every 5 seconds)
    this.pm2UpdateInterval = setInterval(() => {
      this.broadcastPM2Update();
    }, 5000);

    // Start log stream (every 2 seconds)
    this.logStreamInterval = setInterval(() => {
      this.broadcastLogStream();
    }, 2000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Send initial data immediately
    this.sendServiceHealthToClient(client);
    this.sendQueueStatsToClient(client);
    this.sendPM2UpdateToClient(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:service-health')
  handleSubscribeServiceHealth(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Client ${client.id} subscribed to service health updates`);
    this.sendServiceHealthToClient(client);
  }

  @SubscribeMessage('subscribe:queue-stats')
  handleSubscribeQueueStats(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Client ${client.id} subscribed to queue stats updates`);
    this.sendQueueStatsToClient(client);
  }

  @SubscribeMessage('subscribe:logs')
  handleSubscribeLogs(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Client ${client.id} subscribed to log stream`);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  /**
   * Broadcast service health updates to all connected clients
   */
  private async broadcastServiceHealth() {
    try {
      const health = await this.healthService.checkAllServices();
      this.server.emit('service-health', {
        ...health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast service health: ${error.message}`);
    }
  }

  /**
   * Send service health to a specific client
   */
  private async sendServiceHealthToClient(client: Socket) {
    try {
      const health = await this.healthService.checkAllServices();
      client.emit('service-health', {
        ...health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to send service health to client: ${error.message}`);
    }
  }

  /**
   * Broadcast queue statistics to all connected clients
   */
  private async broadcastQueueStats() {
    try {
      const queues = await this.rabbitMQService.listQueues();
      this.server.emit('queue-stats', {
        ...queues,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast queue stats: ${error.message}`);
    }
  }

  /**
   * Send queue stats to a specific client
   */
  private async sendQueueStatsToClient(client: Socket) {
    try {
      const queues = await this.rabbitMQService.listQueues();
      client.emit('queue-stats', {
        ...queues,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to send queue stats to client: ${error.message}`);
    }
  }

  /**
   * Broadcast PM2 process updates to all connected clients
   */
  private async broadcastPM2Update() {
    try {
      const processes = await this.pm2Service.listProcesses();
      this.server.emit('pm2-update', {
        ...processes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to broadcast PM2 update: ${error.message}`);
    }
  }

  /**
   * Send PM2 update to a specific client
   */
  private async sendPM2UpdateToClient(client: Socket) {
    try {
      const processes = await this.pm2Service.listProcesses();
      client.emit('pm2-update', {
        ...processes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Failed to send PM2 update to client: ${error.message}`);
    }
  }

  /**
   * Broadcast log stream to all connected clients
   */
  private broadcastLogStream() {
    try {
      const logs = this.logsService.getRecentLogs(undefined, 20);
      if (logs.length > 0) {
        this.server.emit('log-stream', {
          logs,
          count: logs.length,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to broadcast log stream: ${error.message}`);
    }
  }

  /**
   * Manually trigger a service health update (called when service action is performed)
   */
  async emitServiceHealthUpdate() {
    await this.broadcastServiceHealth();
  }

  /**
   * Manually trigger a PM2 update (called when PM2 action is performed)
   */
  async emitPM2Update() {
    await this.broadcastPM2Update();
  }

  /**
   * Clean up intervals on module destroy
   */
  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.queueStatsInterval) {
      clearInterval(this.queueStatsInterval);
    }
    if (this.pm2UpdateInterval) {
      clearInterval(this.pm2UpdateInterval);
    }
    if (this.logStreamInterval) {
      clearInterval(this.logStreamInterval);
    }
  }
}
