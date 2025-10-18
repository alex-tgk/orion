import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SystemEvent {
  id: string;
  type: string;
  service: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export interface EventFilter {
  events?: string[];
  services?: string[];
  severity?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Event Stream Service
 *
 * Manages system events and provides real-time event streaming.
 */
@Injectable()
export class EventStreamService extends EventEmitter2 {
  private readonly logger = new Logger(EventStreamService.name);
  private events: SystemEvent[] = [];
  private maxEvents = 10000; // Maximum events to keep in memory
  private eventCounter = 0;

  constructor() {
    super({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    });
  }

  /**
   * Record a new system event
   */
  recordEvent(
    type: string,
    service: string,
    severity: SystemEvent['severity'],
    message: string,
    metadata?: Record<string, any>,
    correlationId?: string,
  ): SystemEvent {
    const event: SystemEvent = {
      id: `evt_${++this.eventCounter}`,
      type,
      service,
      severity,
      message,
      timestamp: new Date(),
      metadata,
      correlationId,
    };

    // Store event
    this.events.push(event);

    // Trim old events if necessary
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emit event for real-time subscribers
    this.emit('event', event);
    this.emit(`event.${type}`, event);
    this.emit(`event.${severity}`, event);

    // Log critical events
    if (severity === 'critical') {
      this.logger.error(`Critical event: ${message}`, { service, metadata });
      this.emit('critical', event);
    }

    return event;
  }

  /**
   * Get recent events with optional filtering
   */
  async getRecentEvents(options?: {
    events?: string[];
    filters?: EventFilter;
    limit?: number;
  }): Promise<SystemEvent[]> {
    let filtered = [...this.events];

    if (options?.filters) {
      const { events, services, severity, timeRange } = options.filters;

      if (events && events.length > 0) {
        filtered = filtered.filter(e => events.includes(e.type));
      }

      if (services && services.length > 0) {
        filtered = filtered.filter(e => services.includes(e.service));
      }

      if (severity && severity.length > 0) {
        filtered = filtered.filter(e => severity.includes(e.severity));
      }

      if (timeRange) {
        filtered = filtered.filter(e => {
          const timestamp = e.timestamp.getTime();
          return timestamp >= timeRange.start.getTime() &&
                 timestamp <= timeRange.end.getTime();
        });
      }
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get events by correlation ID
   */
  getEventsByCorrelation(correlationId: string): SystemEvent[] {
    return this.events.filter(e => e.correlationId === correlationId);
  }

  /**
   * Get event statistics
   */
  getEventStats(duration: number = 3600000): {
    total: number;
    bySeverity: Record<string, number>;
    byService: Record<string, number>;
    byType: Record<string, number>;
    rate: number;
  } {
    const now = Date.now();
    const cutoff = now - duration;

    const recentEvents = this.events.filter(
      e => e.timestamp.getTime() >= cutoff
    );

    const stats = {
      total: recentEvents.length,
      bySeverity: {} as Record<string, number>,
      byService: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      rate: 0,
    };

    recentEvents.forEach(event => {
      // Count by severity
      stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;

      // Count by service
      stats.byService[event.service] = (stats.byService[event.service] || 0) + 1;

      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    });

    // Calculate events per minute
    stats.rate = (recentEvents.length / (duration / 60000));

    return stats;
  }

  /**
   * Clear old events
   */
  clearOldEvents(maxAge: number = 86400000) {
    const cutoff = Date.now() - maxAge;
    const beforeCount = this.events.length;

    this.events = this.events.filter(
      e => e.timestamp.getTime() >= cutoff
    );

    const removed = beforeCount - this.events.length;
    if (removed > 0) {
      this.logger.log(`Cleared ${removed} old events`);
    }

    return removed;
  }

  /**
   * Get event stream as observable for real-time updates
   */
  getEventStream(filter?: EventFilter) {
    // This would typically return an Observable or EventEmitter
    // For now, returning filtered events
    return this.getRecentEvents({ filters: filter });
  }

  /**
   * Export events to JSON
   */
  exportEvents(filter?: EventFilter): string {
    const events = filter ?
      this.events.filter(e => this.matchesFilter(e, filter)) :
      this.events;

    return JSON.stringify(events, null, 2);
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: SystemEvent, filter: EventFilter): boolean {
    if (filter.events && !filter.events.includes(event.type)) {
      return false;
    }

    if (filter.services && !filter.services.includes(event.service)) {
      return false;
    }

    if (filter.severity && !filter.severity.includes(event.severity)) {
      return false;
    }

    if (filter.timeRange) {
      const timestamp = event.timestamp.getTime();
      if (timestamp < filter.timeRange.start.getTime() ||
          timestamp > filter.timeRange.end.getTime()) {
        return false;
      }
    }

    return true;
  }
}