import { Injectable, Logger } from '@nestjs/common';

export interface Subscription {
  id: string;
  clientId: string;
  type: string;
  data: any;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Subscription Manager Service
 *
 * Manages WebSocket subscriptions for all connected clients.
 */
@Injectable()
export class SubscriptionManagerService {
  private readonly logger = new Logger(SubscriptionManagerService.name);
  private subscriptions: Map<string, Map<string, Subscription>> = new Map();
  private subscriptionCounter = 0;

  /**
   * Add a subscription for a client
   */
  addSubscription(clientId: string, type: string, data: any): string {
    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, new Map());
    }

    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    const subscription: Subscription = {
      id: subscriptionId,
      clientId,
      type,
      data,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.subscriptions.get(clientId)!.set(subscriptionId, subscription);
    this.logger.debug(`Added subscription ${subscriptionId} for client ${clientId}`);

    return subscriptionId;
  }

  /**
   * Remove a specific subscription
   */
  removeSubscription(clientId: string, subscriptionId: string): boolean {
    const clientSubs = this.subscriptions.get(clientId);
    if (clientSubs) {
      const deleted = clientSubs.delete(subscriptionId);
      if (deleted) {
        this.logger.debug(`Removed subscription ${subscriptionId} for client ${clientId}`);

        // Clean up empty client maps
        if (clientSubs.size === 0) {
          this.subscriptions.delete(clientId);
        }
      }
      return deleted;
    }
    return false;
  }

  /**
   * Remove all subscriptions for a client
   */
  removeAllSubscriptions(clientId: string): number {
    const clientSubs = this.subscriptions.get(clientId);
    if (clientSubs) {
      const count = clientSubs.size;
      this.subscriptions.delete(clientId);
      this.logger.debug(`Removed ${count} subscriptions for client ${clientId}`);
      return count;
    }
    return 0;
  }

  /**
   * Get all subscriptions for a client
   */
  getSubscriptions(clientId: string): Subscription[] {
    const clientSubs = this.subscriptions.get(clientId);
    return clientSubs ? Array.from(clientSubs.values()) : [];
  }

  /**
   * Get subscription by ID
   */
  getSubscription(clientId: string, subscriptionId: string): Subscription | undefined {
    return this.subscriptions.get(clientId)?.get(subscriptionId);
  }

  /**
   * Get all clients with subscriptions of a specific type
   */
  getClientsWithSubscriptionType(type: string): string[] {
    const clients: string[] = [];
    this.subscriptions.forEach((subs, clientId) => {
      const hasType = Array.from(subs.values()).some(sub => sub.type === type);
      if (hasType) {
        clients.push(clientId);
      }
    });
    return clients;
  }

  /**
   * Update last activity for a subscription
   */
  updateActivity(clientId: string, subscriptionId: string) {
    const sub = this.subscriptions.get(clientId)?.get(subscriptionId);
    if (sub) {
      sub.lastActivity = new Date();
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  cleanupInactive(maxInactivityMs: number = 3600000) {
    const now = Date.now();
    let cleaned = 0;

    this.subscriptions.forEach((clientSubs, clientId) => {
      clientSubs.forEach((sub, subId) => {
        if (now - sub.lastActivity.getTime() > maxInactivityMs) {
          clientSubs.delete(subId);
          cleaned++;
        }
      });

      // Remove empty client maps
      if (clientSubs.size === 0) {
        this.subscriptions.delete(clientId);
      }
    });

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} inactive subscriptions`);
    }

    return cleaned;
  }

  /**
   * Get statistics about current subscriptions
   */
  getStats() {
    let totalSubscriptions = 0;
    const typeCount: Record<string, number> = {};

    this.subscriptions.forEach((clientSubs) => {
      clientSubs.forEach((sub) => {
        totalSubscriptions++;
        typeCount[sub.type] = (typeCount[sub.type] || 0) + 1;
      });
    });

    return {
      totalClients: this.subscriptions.size,
      totalSubscriptions,
      subscriptionsByType: typeCount,
    };
  }
}