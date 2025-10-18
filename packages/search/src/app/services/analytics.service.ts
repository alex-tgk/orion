import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  AnalyticsRequestDto,
  AnalyticsPeriod,
  SearchAnalyticsDto,
  PopularQueryDto,
  ZeroResultQueryDto,
} from '../dto/analytics.dto';

interface TrackQueryParams {
  query: string;
  userId?: string;
  resultsCount: number;
  executionTime: number;
  filters?: Record<string, any>;
  entityType?: string;
}

/**
 * Search analytics and metrics service
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env['SEARCH_DATABASE_URL'] || process.env['DATABASE_URL'],
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  /**
   * Track a search query
   */
  async trackQuery(params: TrackQueryParams): Promise<void> {
    const {
      query,
      userId,
      resultsCount,
      executionTime,
      filters = {},
      entityType,
    } = params;

    try {
      await this.prisma.searchQuery.create({
        data: {
          query: query.trim(),
          userId,
          resultsCount,
          executionTime,
          filters,
          entityType,
          hasResults: resultsCount > 0,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track query: ${error.message}`);
    }
  }

  /**
   * Track a search result click
   */
  async trackResultClick(
    searchQueryId: string,
    entityType: string,
    entityId: string,
    position: number,
    userId?: string,
  ): Promise<void> {
    try {
      await this.prisma.searchResultClick.create({
        data: {
          searchQueryId,
          entityType,
          entityId,
          position,
          userId,
          clickedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track result click: ${error.message}`);
    }
  }

  /**
   * Get comprehensive search analytics
   */
  async getAnalytics(
    request: AnalyticsRequestDto,
  ): Promise<SearchAnalyticsDto> {
    const { period = AnalyticsPeriod.DAY, startDate, endDate } = request;

    try {
      const { start, end } = this.calculateDateRange(period, startDate, endDate);

      // Get all queries in the period
      const queries = await this.prisma.searchQuery.findMany({
        where: {
          timestamp: {
            gte: start,
            lte: end,
          },
        },
      });

      // Calculate metrics
      const totalSearches = queries.length;
      const avgExecutionTime =
        queries.reduce((sum, q) => sum + q.executionTime, 0) / totalSearches || 0;
      const zeroResultCount = queries.filter((q) => !q.hasResults).length;
      const zeroResultRate = (zeroResultCount / totalSearches) * 100 || 0;

      // Get popular queries
      const popularQueries = await this.getPopularQueries(start, end);

      // Get zero result queries
      const zeroResultQueries = await this.getZeroResultQueries(start, end);

      // Get entity type distribution
      const entityTypeDistribution = this.calculateEntityTypeDistribution(queries);

      // Get hourly distribution
      const hourlyDistribution = this.calculateHourlyDistribution(queries);

      return {
        totalSearches,
        avgExecutionTime,
        zeroResultRate,
        popularQueries,
        zeroResultQueries,
        entityTypeDistribution,
        hourlyDistribution,
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get popular search queries
   */
  private async getPopularQueries(
    start: Date,
    end: Date,
    limit = 10,
  ): Promise<PopularQueryDto[]> {
    const results = await this.prisma.searchQuery.groupBy({
      by: ['query'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        query: true,
      },
      _avg: {
        resultsCount: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    return results.map((r) => ({
      query: r.query,
      count: r._count.query,
      avgResults: r._avg.resultsCount || 0,
    }));
  }

  /**
   * Get queries that returned zero results
   */
  private async getZeroResultQueries(
    start: Date,
    end: Date,
    limit = 10,
  ): Promise<ZeroResultQueryDto[]> {
    const results = await this.prisma.searchQuery.groupBy({
      by: ['query'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
        hasResults: false,
      },
      _count: {
        query: true,
      },
      _max: {
        timestamp: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    return results.map((r) => ({
      query: r.query,
      count: r._count.query,
      lastOccurrence: r._max.timestamp || new Date(),
    }));
  }

  /**
   * Calculate entity type distribution
   */
  private calculateEntityTypeDistribution(
    queries: any[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    queries.forEach((q) => {
      if (q.entityType) {
        distribution[q.entityType] = (distribution[q.entityType] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Calculate hourly search distribution
   */
  private calculateHourlyDistribution(queries: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    queries.forEach((q) => {
      const hour = new Date(q.timestamp).getHours().toString().padStart(2, '0');
      distribution[hour] = (distribution[hour] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(
    period: AnalyticsPeriod,
    startDate?: string,
    endDate?: string,
  ): { start: Date; end: Date } {
    const end = endDate ? new Date(endDate) : new Date();
    let start: Date;

    if (startDate) {
      start = new Date(startDate);
    } else {
      start = new Date(end);
      switch (period) {
        case AnalyticsPeriod.HOUR:
          start.setHours(start.getHours() - 1);
          break;
        case AnalyticsPeriod.DAY:
          start.setDate(start.getDate() - 1);
          break;
        case AnalyticsPeriod.WEEK:
          start.setDate(start.getDate() - 7);
          break;
        case AnalyticsPeriod.MONTH:
          start.setMonth(start.getMonth() - 1);
          break;
      }
    }

    return { start, end };
  }

  /**
   * Update popular search terms aggregation (can be run periodically)
   */
  async updatePopularTerms(period: AnalyticsPeriod = AnalyticsPeriod.DAY): Promise<void> {
    try {
      const { start, end } = this.calculateDateRange(period);

      const popularQueries = await this.getPopularQueries(start, end, 100);

      for (const query of popularQueries) {
        await this.prisma.popularSearchTerm.upsert({
          where: {
            term: query.query,
          },
          create: {
            term: query.query,
            searchCount: query.count,
            period,
            periodStart: start,
            periodEnd: end,
          },
          update: {
            searchCount: query.count,
            periodEnd: end,
          },
        });
      }

      this.logger.log(`Updated popular terms for ${period} period`);
    } catch (error) {
      this.logger.error(`Failed to update popular terms: ${error.message}`);
    }
  }

  /**
   * Get click-through rate for a query
   */
  async getClickThroughRate(query: string, days = 7): Promise<number> {
    try {
      const start = new Date();
      start.setDate(start.getDate() - days);

      // Get all searches for this query
      const searches = await this.prisma.searchQuery.findMany({
        where: {
          query,
          timestamp: {
            gte: start,
          },
        },
      });

      if (searches.length === 0) {
        return 0;
      }

      // Get clicks on results from these searches
      const clicks = await this.prisma.searchResultClick.count({
        where: {
          searchQueryId: {
            in: searches.map((s) => s.id),
          },
        },
      });

      return (clicks / searches.length) * 100;
    } catch (error) {
      this.logger.error(`Failed to calculate CTR: ${error.message}`);
      return 0;
    }
  }
}
