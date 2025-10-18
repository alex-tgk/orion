import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  UserAnalyticsResponseDto,
  UserActivityTimelineDto,
  UserEngagementDto,
  QueryUserActivityDto,
} from '../dto';
import { Prisma } from '@prisma/analytics';

/**
 * User Analytics Service
 * Handles user-specific analytics and engagement metrics
 */
@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create user analytics record
   */
  async getUserAnalytics(userId: string): Promise<UserAnalyticsResponseDto> {
    let userAnalytics = await this.prisma.userAnalytics.findUnique({
      where: { userId },
    });

    if (!userAnalytics) {
      // Initialize user analytics
      userAnalytics = await this.prisma.userAnalytics.create({
        data: { userId },
      });
    }

    return {
      userId: userAnalytics.userId,
      totalEvents: userAnalytics.totalEvents,
      lastEventAt: userAnalytics.lastEventAt || undefined,
      firstEventAt: userAnalytics.firstEventAt || undefined,
      totalSessions: userAnalytics.totalSessions,
      avgSessionDuration: userAnalytics.avgSessionDuration || undefined,
      lastSessionAt: userAnalytics.lastSessionAt || undefined,
      daysActive: userAnalytics.daysActive,
      longestStreak: userAnalytics.longestStreak,
      currentStreak: userAnalytics.currentStreak,
      featuresUsed: userAnalytics.featuresUsed,
      favoriteFeatures: (userAnalytics.favoriteFeatures as any[]) || [],
      peakUsageHour: userAnalytics.peakUsageHour || undefined,
      peakUsageDay: userAnalytics.peakUsageDay || undefined,
      avgLoadTime: userAnalytics.avgLoadTime || undefined,
      errorRate: userAnalytics.errorRate || undefined,
    };
  }

  /**
   * Update user analytics from events
   */
  async updateUserAnalytics(userId: string): Promise<void> {
    try {
      // Get all events for user
      const events = await this.prisma.event.findMany({
        where: { userId },
        orderBy: { timestamp: 'asc' },
      });

      if (events.length === 0) {
        return;
      }

      const now = new Date();
      const firstEventAt = events[0].timestamp;
      const lastEventAt = events[events.length - 1].timestamp;

      // Calculate unique days active
      const uniqueDays = new Set(
        events.map((e: any) => e.timestamp.toISOString().split('T')[0])
      );
      const daysActive = uniqueDays.size;

      // Calculate streaks
      const sortedDays = Array.from(uniqueDays).sort();
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;

      for (let i = 1; i < sortedDays.length; i++) {
        const prevDate = new Date(sortedDays[i - 1] as string);
        const currDate = new Date(sortedDays[i] as string);
        const diffDays = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      // Check if user was active today or yesterday for current streak
      const lastActiveDate = new Date(sortedDays[sortedDays.length - 1] as string);
      const daysSinceLastActive = Math.floor(
        (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActive <= 1) {
        currentStreak = tempStreak;
      }

      // Calculate peak usage patterns
      const hourCounts: Record<number, number> = {};
      const dayCounts: Record<number, number> = {};

      events.forEach((event: any) => {
        const hour = event.timestamp.getHours();
        const day = event.timestamp.getDay();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const peakUsageHour = parseInt(
        Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '0'
      );
      const peakUsageDay = parseInt(
        Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '0'
      );

      // Calculate features used
      const features = new Set(events.map((e: any) => e.eventName));
      const featuresUsed = Array.from(features);

      // Calculate favorite features (top 5)
      const featureCounts: Record<string, number> = {};
      events.forEach((event: any) => {
        featureCounts[event.eventName] = (featureCounts[event.eventName] || 0) + 1;
      });

      const favoriteFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([feature, count]) => ({ feature, count }));

      // Calculate error rate
      const errorEvents = events.filter((e: any) => !e.success);
      const errorRate = (errorEvents.length / events.length) * 100;

      // Calculate average load time (duration)
      const eventsWithDuration = events.filter((e: any) => e.duration !== null);
      const avgLoadTime =
        eventsWithDuration.length > 0
          ? eventsWithDuration.reduce((sum: number, e: any) => sum + (e.duration || 0), 0) /
            eventsWithDuration.length / 1000 // Convert to seconds
          : undefined;

      // Update user analytics
      await this.prisma.userAnalytics.upsert({
        where: { userId },
        create: {
          userId,
          totalEvents: events.length,
          firstEventAt,
          lastEventAt,
          daysActive,
          longestStreak,
          currentStreak,
          featuresUsed,
          favoriteFeatures,
          peakUsageHour,
          peakUsageDay,
          avgLoadTime,
          errorRate,
        },
        update: {
          totalEvents: events.length,
          firstEventAt,
          lastEventAt,
          daysActive,
          longestStreak,
          currentStreak,
          featuresUsed,
          favoriteFeatures,
          peakUsageHour,
          peakUsageDay,
          avgLoadTime,
          errorRate,
        },
      });

      this.logger.debug(`Updated analytics for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user analytics for ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivityTimeline(
    userId: string,
    dto: QueryUserActivityDto
  ): Promise<UserActivityTimelineDto[]> {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

    const where: Prisma.EventWhereInput = {
      userId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (dto.eventName) where.eventName = dto.eventName;
    if (dto.category) where.category = dto.category;

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    // Group by date
    const grouped = events.reduce((acc: any, event: any) => {
      const date = event.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          events: 0,
          sessions: new Set<string>(),
          features: new Set<string>(),
          errors: 0,
          durations: [] as number[],
        };
      }
      acc[date].events++;
      if (event.sessionId) acc[date].sessions.add(event.sessionId);
      acc[date].features.add(event.eventName);
      if (!event.success) acc[date].errors++;
      if (event.duration) acc[date].durations.push(event.duration);
      return acc;
    }, {} as Record<string, {
      date: string;
      events: number;
      sessions: Set<string>;
      features: Set<string>;
      errors: number;
      durations: number[];
    }>);

    return Object.values(grouped).map((day: any) => ({
      date: day.date,
      events: day.events,
      sessions: day.sessions.size,
      avgSessionDuration:
        day.durations.length > 0
          ? day.durations.reduce((a: number, b: number) => a + b, 0) /
            day.durations.length / 1000
          : undefined,
      uniqueFeatures: day.features.size,
      errors: day.errors,
    }));
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagement(userId: string): Promise<UserEngagementDto> {
    const analytics = await this.getUserAnalytics(userId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get last 7 days activity
    const recentEvents = await this.prisma.event.findMany({
      where: {
        userId,
        timestamp: { gte: sevenDaysAgo },
      },
    });

    const recentDays = new Set(
      recentEvents.map((e: any) => e.timestamp.toISOString().split('T')[0])
    );

    const recentSessions = new Set(
      recentEvents.filter((e: any) => e.sessionId).map((e: any) => e.sessionId)
    );

    // Calculate engagement score (0-100)
    let engagementScore = 0;
    engagementScore += Math.min(recentDays.size * 10, 30); // Daily activity (max 30)
    engagementScore += Math.min(recentEvents.length / 10, 30); // Event count (max 30)
    engagementScore += Math.min(analytics.currentStreak * 5, 20); // Streak bonus (max 20)
    engagementScore += Math.min(analytics.featuresUsed.length * 2, 20); // Feature diversity (max 20)

    // Determine activity level
    let activityLevel: 'low' | 'medium' | 'high' | 'very_high';
    if (engagementScore < 25) activityLevel = 'low';
    else if (engagementScore < 50) activityLevel = 'medium';
    else if (engagementScore < 75) activityLevel = 'high';
    else activityLevel = 'very_high';

    // Determine retention risk
    const daysSinceLastEvent = analytics.lastEventAt
      ? Math.floor((Date.now() - analytics.lastEventAt.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    let retentionRisk: 'low' | 'medium' | 'high';
    if (daysSinceLastEvent > 14 || analytics.currentStreak === 0) {
      retentionRisk = 'high';
    } else if (daysSinceLastEvent > 7 || recentDays.size < 3) {
      retentionRisk = 'medium';
    } else {
      retentionRisk = 'low';
    }

    // Calculate trends (comparing to previous 7 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const previousEvents = await this.prisma.event.findMany({
      where: {
        userId,
        timestamp: {
          gte: fourteenDaysAgo,
          lt: sevenDaysAgo,
        },
      },
    });

    const eventsChange = previousEvents.length > 0
      ? ((recentEvents.length - previousEvents.length) / previousEvents.length) * 100
      : 0;

    const previousSessions = new Set(
      previousEvents.filter((e: any) => e.sessionId).map((e: any) => e.sessionId)
    );
    const sessionsChange = previousSessions.size > 0
      ? ((recentSessions.size - previousSessions.size) / previousSessions.size) * 100
      : 0;

    const recentDurations = recentEvents.filter((e: any) => e.duration).map((e: any) => e.duration as number);
    const previousDurations = previousEvents.filter((e: any) => e.duration).map((e: any) => e.duration as number);

    const recentAvgDuration = recentDurations.length > 0
      ? recentDurations.reduce((a: number, b: number) => a + b, 0) / recentDurations.length
      : 0;
    const previousAvgDuration = previousDurations.length > 0
      ? previousDurations.reduce((a: number, b: number) => a + b, 0) / previousDurations.length
      : 0;

    const durationChange = previousAvgDuration > 0
      ? ((recentAvgDuration - previousAvgDuration) / previousAvgDuration) * 100
      : 0;

    return {
      userId,
      engagementScore,
      activityLevel,
      retentionRisk,
      lastSevenDaysActivity: {
        daysActive: recentDays.size,
        totalEvents: recentEvents.length,
        totalSessions: recentSessions.size,
      },
      trends: {
        eventsChange: Math.round(eventsChange),
        sessionsChange: Math.round(sessionsChange),
        durationChange: Math.round(durationChange),
      },
    };
  }
}
