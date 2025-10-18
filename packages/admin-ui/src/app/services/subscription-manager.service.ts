import { Injectable, Logger } from '@nestjs/common';
import { EventFilters, AlertFilters, SubscriptionInfo } from '../types/websocket-events.types';

interface Subscription {
  clientId: string;
  type: 'service-health' | 'system-events' | 'metrics' | 'alerts';
  serviceName?: string;
  filters?: EventFilters | AlertFilters;
}

/**
 * Manages WebSocket client subscriptions
 * Tracks what each client is subscribed to and provides efficient filtering
 */
@Injectable()
export class SubscriptionManagerService {
  private readonly logger = new Logger(SubscriptionManagerService.name);
  private subscriptions = new Map<string, Set<Subscription>>();

  /**
   * Add a subscription for a client
   */
  subscribe(clientId: string, subscription: SubscriptionInfo): void {
    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, new Set());
    }

    const clientSubs = this.subscriptions.get(clientId)!;

    // Remove existing subscription of same type to avoid duplicates
    for (const sub of clientSubs) {
      if (sub.type === subscription.type && sub.serviceName === subscription.serviceName) {
        clientSubs.delete(sub);
      }
    }

    clientSubs.add({
      clientId,
      type: subscription.type,
      serviceName: subscription.serviceName,
      filters: subscription.filters,
    });

    this.logger.debug(
      `Client ${clientId} subscribed to ${subscription.type}${subscription.serviceName ? ` (${subscription.serviceName})` : ''}`,
    );
  }

  /**
   * Remove a specific subscription for a client
   */
  unsubscribe(clientId: string, type: SubscriptionInfo['type'], serviceName?: string): void {
    const clientSubs = this.subscriptions.get(clientId);
    if (!clientSubs) return;

    for (const sub of clientSubs) {
      if (sub.type === type && sub.serviceName === serviceName) {
        clientSubs.delete(sub);
        this.logger.debug(
          `Client ${clientId} unsubscribed from ${type}${serviceName ? ` (${serviceName})` : ''}`,
        );
        break;
      }
    }

    if (clientSubs.size === 0) {
      this.subscriptions.delete(clientId);
    }
  }

  /**
   * Remove all subscriptions for a client (on disconnect)
   */
  unsubscribeAll(clientId: string): void {
    const count = this.subscriptions.get(clientId)?.size || 0;
    this.subscriptions.delete(clientId);
    this.logger.debug(`Removed ${count} subscriptions for client ${clientId}`);
  }

  /**
   * Get all clients subscribed to service health updates
   */
  getServiceHealthSubscribers(serviceName?: string): string[] {
    const subscribers: string[] = [];

    for (const [clientId, subs] of this.subscriptions.entries()) {
      for (const sub of subs) {
        if (sub.type === 'service-health') {
          // If no specific service or matches the service
          if (!sub.serviceName || !serviceName || sub.serviceName === serviceName) {
            subscribers.push(clientId);
            break; // Only add client once
          }
        }
      }
    }

    return subscribers;
  }

  /**
   * Get all clients subscribed to system events
   */
  getSystemEventSubscribers(filters?: EventFilters): string[] {
    const subscribers: string[] = [];

    for (const [clientId, subs] of this.subscriptions.entries()) {
      for (const sub of subs) {
        if (sub.type === 'system-events') {
          // Check if the event matches client's filters
          if (!filters || this.matchesEventFilters(filters, sub.filters as EventFilters)) {
            subscribers.push(clientId);
            break;
          }
        }
      }
    }

    return subscribers;
  }

  /**
   * Get all clients subscribed to metrics
   */
  getMetricsSubscribers(serviceName?: string): string[] {
    const subscribers: string[] = [];

    for (const [clientId, subs] of this.subscriptions.entries()) {
      for (const sub of subs) {
        if (sub.type === 'metrics') {
          if (!sub.serviceName || !serviceName || sub.serviceName === serviceName) {
            subscribers.push(clientId);
            break;
          }
        }
      }
    }

    return subscribers;
  }

  /**
   * Get all clients subscribed to alerts
   */
  getAlertSubscribers(filters?: AlertFilters): string[] {
    const subscribers: string[] = [];

    for (const [clientId, subs] of this.subscriptions.entries()) {
      for (const sub of subs) {
        if (sub.type === 'alerts') {
          if (!filters || this.matchesAlertFilters(filters, sub.filters as AlertFilters)) {
            subscribers.push(clientId);
            break;
          }
        }
      }
    }

    return subscribers;
  }

  /**
   * Get all subscriptions for a client
   */
  getClientSubscriptions(clientId: string): SubscriptionInfo[] {
    const subs = this.subscriptions.get(clientId);
    if (!subs) return [];

    return Array.from(subs).map((sub) => ({
      type: sub.type,
      serviceName: sub.serviceName,
      filters: sub.filters,
    }));
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    totalClients: number;
    totalSubscriptions: number;
    byType: Record<string, number>;
  } {
    let totalSubscriptions = 0;
    const byType: Record<string, number> = {
      'service-health': 0,
      'system-events': 0,
      metrics: 0,
      alerts: 0,
    };

    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.size;
      for (const sub of subs) {
        byType[sub.type]++;
      }
    }

    return {
      totalClients: this.subscriptions.size,
      totalSubscriptions,
      byType,
    };
  }

  /**
   * Check if event matches client filters
   */
  private matchesEventFilters(
    eventFilters: EventFilters,
    clientFilters?: EventFilters,
  ): boolean {
    if (!clientFilters) return true;

    // Check event types
    if (clientFilters.types && clientFilters.types.length > 0) {
      if (!eventFilters.types || !eventFilters.types.some((t) => clientFilters.types!.includes(t))) {
        return false;
      }
    }

    // Check service names
    if (clientFilters.serviceNames && clientFilters.serviceNames.length > 0) {
      if (
        !eventFilters.serviceNames ||
        !eventFilters.serviceNames.some((s) => clientFilters.serviceNames!.includes(s))
      ) {
        return false;
      }
    }

    // Check severities
    if (clientFilters.severities && clientFilters.severities.length > 0) {
      if (
        !eventFilters.severities ||
        !eventFilters.severities.some((s) => clientFilters.severities!.includes(s))
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if alert matches client filters
   */
  private matchesAlertFilters(
    alertFilters: AlertFilters,
    clientFilters?: AlertFilters,
  ): boolean {
    if (!clientFilters) return true;

    // Check alert types
    if (clientFilters.types && clientFilters.types.length > 0) {
      if (!alertFilters.types || !alertFilters.types.some((t) => clientFilters.types!.includes(t))) {
        return false;
      }
    }

    // Check severities
    if (clientFilters.severities && clientFilters.severities.length > 0) {
      if (
        !alertFilters.severities ||
        !alertFilters.severities.some((s) => clientFilters.severities!.includes(s))
      ) {
        return false;
      }
    }

    // Check service names
    if (clientFilters.serviceNames && clientFilters.serviceNames.length > 0) {
      if (
        !alertFilters.serviceNames ||
        !alertFilters.serviceNames.some((s) => clientFilters.serviceNames!.includes(s))
      ) {
        return false;
      }
    }

    // Check resolved status
    if (clientFilters.resolved !== undefined) {
      if (alertFilters.resolved !== clientFilters.resolved) {
        return false;
      }
    }

    return true;
  }
}
