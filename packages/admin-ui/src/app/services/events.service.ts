import { Injectable, Logger } from '@nestjs/common';
import {
  SystemEventDto,
  EventLevel,
  EventCategory,
  EventsQueryDto,
  EventsResponseDto,
} from '../dto/system-events.dto';
import { CacheService } from './cache.service';
import { randomUUID } from 'crypto';

/**
 * Service for managing system events and activity logs
 * 
 * In a production system, this would integrate with:
 * - A time-series database (e.g., InfluxDB, TimescaleDB)
 * - A log aggregation system (e.g., ELK Stack, Loki)
 * - A message queue (e.g., RabbitMQ, Kafka) for real-time events
 * 
 * For now, we maintain events in memory with a circular buffer
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory
  private events: SystemEventDto[] = [];

  constructor(private readonly cacheService: CacheService) {
    // Initialize with some sample events
    this.initializeSampleEvents();
  }

  /**
   * Log a system event
   */
  logEvent(
    level: EventLevel,
    category: EventCategory,
    serviceName: string,
    message: string,
    metadata?: Record<string, any>,
    userId?: string,
    requestId?: string,
  ): SystemEventDto {
    const event: SystemEventDto = {
      id: randomUUID(),
      level,
      category,
      serviceName,
      message,
      timestamp: new Date().toISOString(),
      ...(metadata && { metadata }),
      ...(userId && { userId }),
      ...(requestId && { requestId }),
    };

    this.events.unshift(event); // Add to beginning

    // Maintain circular buffer
    if (this.events.length > this.MAX_EVENTS) {
      this.events.pop();
    }

    // Log to console for visibility
    const logMethod = this.getLogMethod(level);
    this.logger[logMethod](
      `[${category}] ${serviceName}: ${message}`,
      metadata ? JSON.stringify(metadata) : '',
    );

    return event;
  }

  /**
   * Query events with filtering and pagination
   */
  async queryEvents(query: EventsQueryDto): Promise<EventsResponseDto> {
    const {
      limit = 100,
      offset = 0,
      level,
      category,
      serviceName,
      startTime,
      endTime,
    } = query;

    // Filter events
    let filtered = [...this.events];

    if (level) {
      filtered = filtered.filter((e) => e.level === level);
    }

    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }

    if (serviceName) {
      filtered = filtered.filter((e) => e.serviceName === serviceName);
    }

    if (startTime) {
      const start = new Date(startTime);
      filtered = filtered.filter((e) => new Date(e.timestamp) >= start);
    }

    if (endTime) {
      const end = new Date(endTime);
      filtered = filtered.filter((e) => new Date(e.timestamp) <= end);
    }

    const total = filtered.length;
    const paginatedEvents = filtered.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      total,
      count: paginatedEvents.length,
      offset,
      limit,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get recent events (shortcut method)
   */
  async getRecentEvents(limit: number = 100): Promise<SystemEventDto[]> {
    return this.events.slice(0, limit);
  }

  /**
   * Get events by service
   */
  async getEventsByService(serviceName: string, limit: number = 100): Promise<SystemEventDto[]> {
    return this.events.filter((e) => e.serviceName === serviceName).slice(0, limit);
  }

  /**
   * Get critical events
   */
  async getCriticalEvents(limit: number = 50): Promise<SystemEventDto[]> {
    return this.events
      .filter((e) => e.level === EventLevel.CRITICAL || e.level === EventLevel.ERROR)
      .slice(0, limit);
  }

  /**
   * Get event statistics
   */
  async getEventStats(): Promise<{
    total: number;
    byLevel: Record<EventLevel, number>;
    byCategory: Record<EventCategory, number>;
    byService: Record<string, number>;
  }> {
    const byLevel: Record<EventLevel, number> = {
      [EventLevel.INFO]: 0,
      [EventLevel.WARN]: 0,
      [EventLevel.ERROR]: 0,
      [EventLevel.CRITICAL]: 0,
    };

    const byCategory: Record<EventCategory, number> = {
      [EventCategory.SYSTEM]: 0,
      [EventCategory.SERVICE]: 0,
      [EventCategory.SECURITY]: 0,
      [EventCategory.DEPLOYMENT]: 0,
      [EventCategory.PERFORMANCE]: 0,
      [EventCategory.USER]: 0,
    };

    const byService: Record<string, number> = {};

    for (const event of this.events) {
      byLevel[event.level]++;
      byCategory[event.category]++;
      byService[event.serviceName] = (byService[event.serviceName] || 0) + 1;
    }

    return {
      total: this.events.length,
      byLevel,
      byCategory,
      byService,
    };
  }

  /**
   * Clear old events (older than specified date)
   */
  async clearOldEvents(olderThan: Date): Promise<number> {
    const initialLength = this.events.length;
    this.events = this.events.filter((e) => new Date(e.timestamp) >= olderThan);
    const removed = initialLength - this.events.length;
    
    if (removed > 0) {
      this.logger.log(`Cleared ${removed} old events`);
    }
    
    return removed;
  }

  /**
   * Clear all events
   */
  async clearAllEvents(): Promise<void> {
    this.events = [];
    this.logger.warn('All events cleared');
  }

  /**
   * Get log method based on event level
   */
  private getLogMethod(level: EventLevel): 'log' | 'warn' | 'error' {
    switch (level) {
      case EventLevel.CRITICAL:
      case EventLevel.ERROR:
        return 'error';
      case EventLevel.WARN:
        return 'warn';
      default:
        return 'log';
    }
  }

  /**
   * Initialize with sample events for demonstration
   */
  private initializeSampleEvents(): void {
    const now = Date.now();
    const samples: Omit<SystemEventDto, 'id' | 'timestamp'>[] = [
      {
        level: EventLevel.INFO,
        category: EventCategory.SYSTEM,
        serviceName: 'admin-ui',
        message: 'Admin UI service started successfully',
        metadata: { port: 20000 },
      },
      {
        level: EventLevel.INFO,
        category: EventCategory.SERVICE,
        serviceName: 'auth',
        message: 'Authentication service initialized',
        metadata: { version: '1.0.0' },
      },
      {
        level: EventLevel.WARN,
        category: EventCategory.PERFORMANCE,
        serviceName: 'gateway',
        message: 'High response time detected',
        metadata: { avgResponseTime: 1250, threshold: 1000 },
      },
      {
        level: EventLevel.INFO,
        category: EventCategory.DEPLOYMENT,
        serviceName: 'orchestrator',
        message: 'Service deployment completed',
        metadata: { version: '1.1.0', environment: 'production' },
      },
      {
        level: EventLevel.ERROR,
        category: EventCategory.SERVICE,
        serviceName: 'cache',
        message: 'Redis connection failed, falling back to in-memory cache',
        metadata: { error: 'ECONNREFUSED' },
      },
      {
        level: EventLevel.INFO,
        category: EventCategory.SECURITY,
        serviceName: 'auth',
        message: 'User authentication successful',
        userId: 'user-123',
        metadata: { method: 'jwt' },
      },
      {
        level: EventLevel.WARN,
        category: EventCategory.SECURITY,
        serviceName: 'auth',
        message: 'Failed login attempt',
        metadata: { attempts: 3, ip: '192.168.1.100' },
      },
      {
        level: EventLevel.INFO,
        category: EventCategory.USER,
        serviceName: 'admin-ui',
        message: 'User viewed dashboard',
        userId: 'user-456',
      },
    ];

    // Create events with timestamps spread over the last hour
    samples.forEach((sample, index) => {
      const event: SystemEventDto = {
        ...sample,
        id: randomUUID(),
        timestamp: new Date(now - (samples.length - index) * 5 * 60 * 1000).toISOString(),
      };
      this.events.push(event);
    });
  }
}
