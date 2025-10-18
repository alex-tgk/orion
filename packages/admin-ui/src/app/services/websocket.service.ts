import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface ClientSubscription {
  clientId: string;
  namespace: string;
  subscription: any;
  joinedAt: Date;
}

/**
 * WebSocket Service
 *
 * Manages WebSocket connections and broadcasts across all namespaces.
 */
@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private servers: Map<string, Server> = new Map();
  private clients: Map<string, ClientSubscription[]> = new Map();

  /**
   * Register a WebSocket server
   */
  registerServer(namespace: string, server: Server) {
    this.servers.set(namespace, server);
    this.logger.log(`Registered WebSocket server for namespace: ${namespace}`);
  }

  /**
   * Get a registered server
   */
  getServer(namespace: string): Server | undefined {
    return this.servers.get(namespace);
  }

  /**
   * Track client connection
   */
  addClient(clientId: string, namespace: string, subscription: any) {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, []);
    }

    this.clients.get(clientId)!.push({
      clientId,
      namespace,
      subscription,
      joinedAt: new Date(),
    });

    this.logger.debug(`Client ${clientId} joined namespace ${namespace}`);
  }

  /**
   * Remove client connection
   */
  removeClient(clientId: string, namespace?: string) {
    if (namespace) {
      const subs = this.clients.get(clientId) || [];
      const filtered = subs.filter(s => s.namespace !== namespace);
      if (filtered.length > 0) {
        this.clients.set(clientId, filtered);
      } else {
        this.clients.delete(clientId);
      }
    } else {
      this.clients.delete(clientId);
    }

    this.logger.debug(`Client ${clientId} removed from ${namespace || 'all namespaces'}`);
  }

  /**
   * Get all connected clients
   */
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get clients by namespace
   */
  getClientsByNamespace(namespace: string): string[] {
    const clients: string[] = [];
    this.clients.forEach((subs, clientId) => {
      if (subs.some(s => s.namespace === namespace)) {
        clients.push(clientId);
      }
    });
    return clients;
  }

  /**
   * Broadcast to all clients in a namespace
   */
  broadcast(namespace: string, event: string, data: any) {
    const server = this.servers.get(namespace);
    if (server) {
      server.emit(event, data);
      this.logger.debug(`Broadcasted ${event} to ${namespace}`);
    } else {
      this.logger.warn(`Server not found for namespace: ${namespace}`);
    }
  }

  /**
   * Broadcast to specific room in a namespace
   */
  broadcastToRoom(namespace: string, room: string, event: string, data: any) {
    const server = this.servers.get(namespace);
    if (server) {
      server.to(room).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to room ${room} in ${namespace}`);
    }
  }

  /**
   * Send to specific client
   */
  sendToClient(namespace: string, clientId: string, event: string, data: any) {
    const server = this.servers.get(namespace);
    if (server) {
      server.to(clientId).emit(event, data);
      this.logger.debug(`Sent ${event} to client ${clientId} in ${namespace}`);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const stats: any = {
      totalClients: this.clients.size,
      namespaces: {},
    };

    this.servers.forEach((server, namespace) => {
      stats.namespaces[namespace] = {
        connected: this.getClientsByNamespace(namespace).length,
      };
    });

    return stats;
  }
}