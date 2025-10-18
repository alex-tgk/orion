import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DashboardResponseDto, DashboardQueryDto } from '../dto';

/**
 * Dashboard Service
 * Provides aggregated data for analytics dashboards
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard summary data
   */
  async getDashboardData(dto: DashboardQueryDto): Promise<DashboardResponseDto> {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));

    // Build base where clause
    const baseWhere: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (dto.serviceId) baseWhere.serviceId = dto.serviceId;
    if (dto.userId) baseWhere.userId = dto.userId;

    // Get summary metrics
    const [
      totalEvents,
      uniqueUsers,
      uniqueSessions,
      errorEvents,
      eventsWithDuration,
    ] = await Promise.all([
      this.prisma.event.count({ where: baseWhere }),
      this.prisma.event.findMany({
        where: baseWhere,
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.event.findMany({
        where: baseWhere,
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      this.prisma.event.count({
        where: { ...baseWhere, success: false },
      }),
      this.prisma.event.findMany({
        where: {
          ...baseWhere,
          duration: { not: null },
        },
        select: { duration: true },
      }),
    ]);

    const totalUsers = uniqueUsers.filter((u) => u.userId).length;
    const totalSessions = uniqueSessions.filter((s) => s.sessionId).length;
    const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

    const avgSessionDuration = eventsWithDuration.length > 0
      ? eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) /
        eventsWithDuration.length / 1000
      : 0;

    // Get top events with trends
    const topEvents = await this.getTopEventsWithTrends(
      startDate,
      endDate,
      previousPeriodStart,
      dto.serviceId,
      dto.userId
    );

    // Get user activity timeline
    const userActivity = await this.getUserActivityTimeline(
      startDate,
      endDate,
      dto.serviceId,
      dto.userId
    );

    // Get service performance metrics
    const servicePerformance = await this.getServicePerformance(
      startDate,
      endDate,
      dto.serviceId
    );

    // Get cost metrics if available
    const costs = await this.getCostSummary(startDate, endDate, dto.serviceId, dto.userId);

    return {
      summary: {
        totalEvents,
        totalUsers,
        totalSessions,
        avgSessionDuration,
        errorRate,
      },
      topEvents,
      userActivity,
      servicePerformance,
      costs,
    };
  }

  /**
   * Get top events with trend comparison
   */
  private async getTopEventsWithTrends(
    startDate: Date,
    endDate: Date,
    previousPeriodStart: Date,
    serviceId?: string,
    userId?: string
  ) {
    const currentWhere: any = {
      timestamp: { gte: startDate, lte: endDate },
    };
    const previousWhere: any = {
      timestamp: { gte: previousPeriodStart, lt: startDate },
    };

    if (serviceId) {
      currentWhere.serviceId = serviceId;
      previousWhere.serviceId = serviceId;
    }
    if (userId) {
      currentWhere.userId = userId;
      previousWhere.userId = userId;
    }

    const [currentEvents, previousEvents] = await Promise.all([
      this.prisma.event.groupBy({
        by: ['eventName'],
        where: currentWhere,
        _count: { eventName: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 10,
      }),
      this.prisma.event.groupBy({
        by: ['eventName'],
        where: previousWhere,
        _count: { eventName: true },
      }),
    ]);

    const previousMap = new Map(
      previousEvents.map((e) => [e.eventName, e._count.eventName])
    );

    return currentEvents.map((event) => {
      const count = event._count.eventName;
      const previousCount = previousMap.get(event.eventName) || 0;
      const trend = previousCount > 0 ? ((count - previousCount) / previousCount) * 100 : 0;

      return {
        eventName: event.eventName,
        count,
        trend: Math.round(trend),
      };
    });
  }

  /**
   * Get user activity timeline
   */
  private async getUserActivityTimeline(
    startDate: Date,
    endDate: Date,
    serviceId?: string,
    userId?: string
  ) {
    const where: any = {
      timestamp: { gte: startDate, lte: endDate },
    };

    if (serviceId) where.serviceId = serviceId;
    if (userId) where.userId = userId;

    const events = await this.prisma.event.findMany({
      where,
      select: {
        timestamp: true,
        userId: true,
        sessionId: true,
      },
    });

    // Group by date
    const grouped = events.reduce((acc, event) => {
      const date = event.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          activeUsers: new Set<string>(),
          sessions: new Set<string>(),
          events: 0,
        };
      }
      if (event.userId) acc[date].activeUsers.add(event.userId);
      if (event.sessionId) acc[date].sessions.add(event.sessionId);
      acc[date].events++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .map((day: any) => ({
        date: day.date,
        activeUsers: day.activeUsers.size,
        sessions: day.sessions.size,
        events: day.events,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get service performance metrics
   */
  private async getServicePerformance(
    startDate: Date,
    endDate: Date,
    serviceId?: string
  ) {
    const where: any = {
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    };

    if (serviceId) where.serviceId = serviceId;

    const serviceMetrics = await this.prisma.serviceMetrics.findMany({
      where,
      orderBy: { periodStart: 'desc' },
    });

    if (serviceMetrics.length === 0) {
      return [];
    }

    // Group by service and calculate averages
    const grouped = serviceMetrics.reduce((acc, metric) => {
      const key = metric.serviceId;
      if (!acc[key]) {
        acc[key] = {
          serviceId: metric.serviceId,
          latencies: [],
          errorRates: [],
          throughputs: [],
        };
      }
      if (metric.avgLatency) acc[key].latencies.push(metric.avgLatency);
      if (metric.errorRate !== null) acc[key].errorRates.push(metric.errorRate);
      if (metric.requestsPerSecond) acc[key].throughputs.push(metric.requestsPerSecond);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map((service: any) => ({
      serviceId: service.serviceId,
      avgLatency: service.latencies.length > 0
        ? service.latencies.reduce((a: number, b: number) => a + b, 0) / service.latencies.length
        : 0,
      errorRate: service.errorRates.length > 0
        ? service.errorRates.reduce((a: number, b: number) => a + b, 0) / service.errorRates.length
        : 0,
      requestsPerSecond: service.throughputs.length > 0
        ? service.throughputs.reduce((a: number, b: number) => a + b, 0) / service.throughputs.length
        : 0,
    }));
  }

  /**
   * Get cost summary
   */
  private async getCostSummary(
    startDate: Date,
    endDate: Date,
    serviceId?: string,
    userId?: string
  ) {
    const where: any = {
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    };

    if (serviceId) where.serviceId = serviceId;
    if (userId) where.userId = userId;

    const costMetrics = await this.prisma.costMetric.findMany({
      where,
    });

    if (costMetrics.length === 0) {
      return undefined;
    }

    const total = costMetrics.reduce((sum, metric) => sum + metric.amount, 0);
    const currency = costMetrics[0]?.currency || 'USD';

    // Group by resource type
    const breakdown = costMetrics.reduce((acc, metric) => {
      const existing = acc.find((item) => item.resourceType === metric.resourceType);
      if (existing) {
        existing.amount += metric.amount;
      } else {
        acc.push({
          resourceType: metric.resourceType,
          amount: metric.amount,
        });
      }
      return acc;
    }, [] as Array<{ resourceType: string; amount: number }>);

    return {
      total,
      currency,
      breakdown: breakdown.sort((a, b) => b.amount - a.amount),
    };
  }
}
