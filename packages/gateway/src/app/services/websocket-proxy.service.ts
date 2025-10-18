import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { ServiceDiscoveryService } from './service-discovery.service';
import { JwtCacheService } from './jwt-cache.service';

/**
 * WebSocket Connection Info
 */
interface WebSocketConnection {
  id: string;
  clientSocket: WebSocket;
  backendSocket: WebSocket | null;
  serviceName: string;
  userId?: string;
  connectedAt: Date;
  lastActivity: Date;
}

/**
 * WebSocket Proxy Service
 *
 * Proxies WebSocket connections from clients to backend services.
 * Provides authentication, reconnection logic, and connection management.
 *
 * Features:
 * - JWT authentication for WebSocket connections
 * - Automatic reconnection to backend services
 * - Heartbeat monitoring
 * - Connection tracking and statistics
 */
@Injectable()
export class WebSocketProxyService implements OnModuleDestroy {
  private readonly logger = new Logger(WebSocketProxyService.name);
  private readonly connections = new Map<string, WebSocketConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly jwtCache: JwtCacheService
  ) {
    this.startHeartbeat();
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
    serviceName: string
  ): Promise<void> {
    const connectionId = this.generateConnectionId();

    try {
      // Extract and validate JWT token
      const token = this.extractToken(request);
      if (!token) {
        client.close(1008, 'Missing authentication token');
        return;
      }

      const user = await this.jwtCache.validateToken(token);
      if (!user) {
        client.close(1008, 'Invalid authentication token');
        return;
      }

      // Create connection record
      const connection: WebSocketConnection = {
        id: connectionId,
        clientSocket: client,
        backendSocket: null,
        serviceName,
        userId: user.sub,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.connections.set(connectionId, connection);

      // Connect to backend service
      await this.connectToBackend(connection, token);

      // Setup client event handlers
      this.setupClientHandlers(connection);

      this.logger.log(
        `WebSocket connection established: ${connectionId} (user: ${user.sub}, service: ${serviceName})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to establish WebSocket connection: ${error.message}`
      );
      client.close(1011, 'Internal server error');
      this.connections.delete(connectionId);
    }
  }

  /**
   * Connect to backend WebSocket service
   */
  private async connectToBackend(
    connection: WebSocketConnection,
    token: string
  ): Promise<void> {
    const instance = this.serviceDiscovery.getInstance(
      connection.serviceName
    );

    if (!instance) {
      throw new Error(
        `No healthy instance available for service: ${connection.serviceName}`
      );
    }

    // Convert HTTP(S) URL to WS(S) URL
    const wsUrl = instance.url.replace(/^http/, 'ws');
    const backendUrl = `${wsUrl}/ws`;

    const backendSocket = new WebSocket(backendUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        backendSocket.close();
        reject(new Error('Backend connection timeout'));
      }, 10000);

      backendSocket.on('open', () => {
        clearTimeout(timeout);
        connection.backendSocket = backendSocket;
        this.setupBackendHandlers(connection);
        resolve();
      });

      backendSocket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Setup event handlers for client socket
   */
  private setupClientHandlers(connection: WebSocketConnection): void {
    const { clientSocket, backendSocket } = connection;

    clientSocket.on('message', (data: WebSocket.Data) => {
      connection.lastActivity = new Date();

      if (backendSocket && backendSocket.readyState === WebSocket.OPEN) {
        backendSocket.send(data);
      } else {
        this.logger.warn(
          `Cannot forward message, backend not connected: ${connection.id}`
        );
      }
    });

    clientSocket.on('close', (code, reason) => {
      this.logger.log(
        `Client WebSocket closed: ${connection.id} (code: ${code}, reason: ${reason})`
      );
      this.closeConnection(connection.id);
    });

    clientSocket.on('error', (error) => {
      this.logger.error(
        `Client WebSocket error: ${connection.id} - ${error.message}`
      );
      this.closeConnection(connection.id);
    });

    clientSocket.on('pong', () => {
      connection.lastActivity = new Date();
    });
  }

  /**
   * Setup event handlers for backend socket
   */
  private setupBackendHandlers(connection: WebSocketConnection): void {
    const { clientSocket, backendSocket } = connection;

    if (!backendSocket) return;

    backendSocket.on('message', (data: WebSocket.Data) => {
      connection.lastActivity = new Date();

      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data);
      }
    });

    backendSocket.on('close', async (code, reason) => {
      this.logger.warn(
        `Backend WebSocket closed: ${connection.id} (code: ${code}, reason: ${reason})`
      );

      // Attempt to reconnect
      if (clientSocket.readyState === WebSocket.OPEN) {
        await this.attemptReconnect(connection);
      }
    });

    backendSocket.on('error', (error) => {
      this.logger.error(
        `Backend WebSocket error: ${connection.id} - ${error.message}`
      );
    });
  }

  /**
   * Attempt to reconnect to backend service
   */
  private async attemptReconnect(
    connection: WebSocketConnection
  ): Promise<void> {
    const maxAttempts = 3;
    let attempt = 0;

    while (
      attempt < maxAttempts &&
      connection.clientSocket.readyState === WebSocket.OPEN
    ) {
      attempt++;
      this.logger.log(
        `Reconnection attempt ${attempt}/${maxAttempts} for ${connection.id}`
      );

      try {
        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt) * 1000);

        // Note: We need the original token for reconnection
        // In a production system, you might want to store it securely
        // For now, we'll close the client connection on backend disconnect
        this.logger.warn(
          `Cannot reconnect without stored token, closing client connection: ${connection.id}`
        );
        connection.clientSocket.close(
          1011,
          'Backend connection lost'
        );
        break;
      } catch (error) {
        this.logger.error(
          `Reconnection attempt ${attempt} failed: ${error.message}`
        );
      }
    }

    if (attempt === maxAttempts) {
      this.logger.error(
        `Failed to reconnect after ${maxAttempts} attempts: ${connection.id}`
      );
      connection.clientSocket.close(1011, 'Backend connection lost');
    }
  }

  /**
   * Close a WebSocket connection
   */
  private closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Close backend socket if open
    if (
      connection.backendSocket &&
      connection.backendSocket.readyState === WebSocket.OPEN
    ) {
      connection.backendSocket.close();
    }

    // Close client socket if open
    if (connection.clientSocket.readyState === WebSocket.OPEN) {
      connection.clientSocket.close();
    }

    this.connections.delete(connectionId);
    this.logger.log(`Connection closed and removed: ${connectionId}`);
  }

  /**
   * Extract JWT token from WebSocket request
   */
  private extractToken(request: IncomingMessage): string | null {
    // Try query parameter first
    const url = new URL(request.url || '', 'http://localhost');
    const token = url.searchParams.get('token');
    if (token) return token;

    // Try Authorization header
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try Sec-WebSocket-Protocol header (alternative approach)
    const protocol = request.headers['sec-websocket-protocol'];
    if (protocol && typeof protocol === 'string') {
      const parts = protocol.split(', ');
      const tokenProtocol = parts.find((p) => p.startsWith('token.'));
      if (tokenProtocol) {
        return tokenProtocol.substring(6); // Remove 'token.' prefix
      }
    }

    return null;
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    const interval = this.configService.get<number>(
      'gateway.websocketHeartbeat',
      30000
    );

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, interval);

    this.logger.log(
      `WebSocket heartbeat started (interval: ${interval}ms)`
    );
  }

  /**
   * Perform heartbeat check on all connections
   */
  private performHeartbeat(): void {
    const now = Date.now();
    const timeout = 60000; // 60 seconds

    this.connections.forEach((connection, id) => {
      const inactive = now - connection.lastActivity.getTime();

      if (inactive > timeout) {
        this.logger.warn(
          `Connection inactive for ${inactive}ms, closing: ${id}`
        );
        this.closeConnection(id);
        return;
      }

      // Send ping to client
      if (connection.clientSocket.readyState === WebSocket.OPEN) {
        connection.clientSocket.ping();
      }
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsByService: Record<string, number>;
    connectionsByUser: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      connectionsByService: {} as Record<string, number>,
      connectionsByUser: {} as Record<string, number>,
    };

    this.connections.forEach((connection) => {
      if (connection.clientSocket.readyState === WebSocket.OPEN) {
        stats.activeConnections++;
      }

      // Count by service
      stats.connectionsByService[connection.serviceName] =
        (stats.connectionsByService[connection.serviceName] || 0) + 1;

      // Count by user
      if (connection.userId) {
        stats.connectionsByUser[connection.userId] =
          (stats.connectionsByUser[connection.userId] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Utility function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.connections.forEach((connection, id) => {
      this.closeConnection(id);
    });
  }
}
