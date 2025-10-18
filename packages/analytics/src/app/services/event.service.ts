import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TrackEventDto, EventResponseDto, BulkTrackEventDto } from '../dto';
import { Event, EventType, Prisma } from '@prisma/analytics';

/**
 * Event Service
 * Handles event tracking and storage
 */
@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track a single event
   */
  async trackEvent(dto: TrackEventDto): Promise<EventResponseDto> {
    try {
      const event = await this.prisma.event.create({
        data: {
          eventName: dto.eventName,
          eventType: dto.eventType || EventType.USER_ACTION,
          category: dto.category,
          userId: dto.userId,
          sessionId: dto.sessionId,
          serviceId: dto.serviceId,
          properties: dto.properties || {},
          metadata: dto.metadata || {},
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          location: dto.location,
          duration: dto.duration,
          success: dto.success ?? true,
          errorMessage: dto.errorMessage,
          tags: dto.tags || [],
        },
      });

      this.logger.log(`Event tracked: ${event.eventName} (${event.id})`);

      return {
        id: event.id,
        eventName: event.eventName,
        eventType: event.eventType as EventType,
        timestamp: event.timestamp,
        success: event.success,
      };
    } catch (error) {
      this.logger.error('Failed to track event', error);
      throw error;
    }
  }

  /**
   * Track multiple events in bulk
   */
  async trackBulkEvents(dto: BulkTrackEventDto): Promise<EventResponseDto[]> {
    try {
      const events = await this.prisma.$transaction(
        dto.events.map((eventDto) =>
          this.prisma.event.create({
            data: {
              eventName: eventDto.eventName,
              eventType: eventDto.eventType || EventType.USER_ACTION,
              category: eventDto.category,
              userId: eventDto.userId,
              sessionId: eventDto.sessionId,
              serviceId: eventDto.serviceId,
              properties: eventDto.properties || {},
              metadata: eventDto.metadata || {},
              ipAddress: eventDto.ipAddress,
              userAgent: eventDto.userAgent,
              location: eventDto.location,
              duration: eventDto.duration,
              success: eventDto.success ?? true,
              errorMessage: eventDto.errorMessage,
              tags: eventDto.tags || [],
            },
          })
        )
      );

      this.logger.log(`Bulk tracked ${events.length} events`);

      return events.map((event) => ({
        id: event.id,
        eventName: event.eventName,
        eventType: event.eventType as EventType,
        timestamp: event.timestamp,
        success: event.success,
      }));
    } catch (error) {
      this.logger.error('Failed to track bulk events', error);
      throw error;
    }
  }

  /**
   * Get events with filtering
   */
  async getEvents(filters: {
    userId?: string;
    sessionId?: string;
    eventName?: string;
    eventType?: EventType;
    category?: string;
    serviceId?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Event[]> {
    const where: Prisma.EventWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.eventName) where.eventName = filters.eventName;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.category) where.category = filters.category;
    if (filters.serviceId) where.serviceId = filters.serviceId;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Count events by criteria
   */
  async countEvents(filters: {
    userId?: string;
    eventName?: string;
    eventType?: EventType;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const where: Prisma.EventWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.eventName) where.eventName = filters.eventName;
    if (filters.eventType) where.eventType = filters.eventType;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.event.count({ where });
  }

  /**
   * Get top events by count
   */
  async getTopEvents(filters: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<{ eventName: string; count: number }>> {
    const where: Prisma.EventWhereInput = {};

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const result = await this.prisma.event.groupBy({
      by: ['eventName'],
      where,
      _count: {
        eventName: true,
      },
      orderBy: {
        _count: {
          eventName: 'desc',
        },
      },
      take: filters.limit || 10,
    });

    return result.map((item) => ({
      eventName: item.eventName,
      count: item._count.eventName,
    }));
  }

  /**
   * Delete old events based on retention policy
   */
  async cleanupOldEvents(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.event.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} events older than ${retentionDays} days`);
    return result.count;
  }
}
