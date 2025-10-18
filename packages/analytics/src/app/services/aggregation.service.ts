import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { QueryAggregationDto, AggregationResponseDto } from '../dto';
import { AggregationPeriod, AggregationType, Prisma } from '@prisma/analytics';

/**
 * Aggregation Service
 * Handles metric aggregation and pre-computation
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update an aggregation
   */
  async createAggregation(data: {
    metricName: string;
    period: AggregationPeriod;
    periodStart: Date;
    periodEnd: Date;
    aggregationType: AggregationType;
    value: number;
    dimensions?: Record<string, any>;
    count?: number;
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    stdDev?: number;
    buckets?: Record<string, any>;
    percentiles?: Record<string, any>;
    tags?: string[];
    metadata?: Record<string, any>;
  }) {
    try {
      const aggregation = await this.prisma.aggregation.upsert({
        where: {
          metricName_period_periodStart_aggregationType_dimensions: {
            metricName: data.metricName,
            period: data.period,
            periodStart: data.periodStart,
            aggregationType: data.aggregationType,
            dimensions: data.dimensions || {},
          },
        },
        create: {
          metricName: data.metricName,
          period: data.period,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          aggregationType: data.aggregationType,
          value: data.value,
          dimensions: data.dimensions || {},
          count: data.count || 0,
          min: data.min,
          max: data.max,
          avg: data.avg,
          sum: data.sum,
          stdDev: data.stdDev,
          buckets: data.buckets,
          percentiles: data.percentiles,
          tags: data.tags || [],
          metadata: data.metadata || {},
        },
        update: {
          value: data.value,
          periodEnd: data.periodEnd,
          count: data.count,
          min: data.min,
          max: data.max,
          avg: data.avg,
          sum: data.sum,
          stdDev: data.stdDev,
          buckets: data.buckets,
          percentiles: data.percentiles,
        },
      });

      this.logger.debug(
        `Aggregation created: ${aggregation.metricName} (${aggregation.period})`
      );
      return aggregation;
    } catch (error) {
      this.logger.error('Failed to create aggregation', error);
      throw error;
    }
  }

  /**
   * Query aggregations
   */
  async queryAggregations(dto: QueryAggregationDto): Promise<AggregationResponseDto[]> {
    const where: Prisma.AggregationWhereInput = {
      metricName: dto.metricName,
      period: dto.period,
      aggregationType: dto.aggregationType,
    };

    if (dto.startDate || dto.endDate) {
      where.periodStart = {};
      if (dto.startDate) where.periodStart.gte = new Date(dto.startDate);
      if (dto.endDate) where.periodStart.lte = new Date(dto.endDate);
    }

    if (dto.dimensions) {
      where.dimensions = { equals: dto.dimensions };
    }

    const aggregations = await this.prisma.aggregation.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: dto.limit || 100,
    });

    return aggregations.map((agg) => ({
      id: agg.id,
      metricName: agg.metricName,
      period: agg.period as AggregationPeriod,
      periodStart: agg.periodStart,
      periodEnd: agg.periodEnd,
      aggregationType: agg.aggregationType as AggregationType,
      value: agg.value,
      count: agg.count,
      min: agg.min || undefined,
      max: agg.max || undefined,
      avg: agg.avg || undefined,
      sum: agg.sum || undefined,
      stdDev: agg.stdDev || undefined,
      percentiles: agg.percentiles as Record<string, number> | undefined,
      dimensions: agg.dimensions as Record<string, any> | undefined,
    }));
  }

  /**
   * Aggregate metrics for a period
   * This is called by a scheduled job
   */
  async aggregateMetricsForPeriod(
    metricName: string,
    period: AggregationPeriod,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    try {
      // Get all metrics for the period
      const metrics = await this.prisma.metric.findMany({
        where: {
          name: metricName,
          timestamp: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
      });

      if (metrics.length === 0) {
        this.logger.debug(`No metrics found for ${metricName} in period ${period}`);
        return;
      }

      // Calculate aggregations
      const values = metrics.map((m) => m.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      const avg = sum / count;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Calculate standard deviation
      const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      // Calculate percentiles
      const sorted = [...values].sort((a, b) => a - b);
      const p50Index = Math.floor(count * 0.5);
      const p95Index = Math.floor(count * 0.95);
      const p99Index = Math.floor(count * 0.99);

      const percentiles = {
        p50: sorted[p50Index],
        p95: sorted[p95Index],
        p99: sorted[p99Index],
      };

      // Create aggregations for each type
      const aggregationTypes = [
        AggregationType.SUM,
        AggregationType.AVG,
        AggregationType.MIN,
        AggregationType.MAX,
        AggregationType.COUNT,
        AggregationType.PERCENTILE_50,
        AggregationType.PERCENTILE_95,
        AggregationType.PERCENTILE_99,
      ];

      for (const aggType of aggregationTypes) {
        let value: number;

        switch (aggType) {
          case AggregationType.SUM:
            value = sum;
            break;
          case AggregationType.AVG:
            value = avg;
            break;
          case AggregationType.MIN:
            value = min;
            break;
          case AggregationType.MAX:
            value = max;
            break;
          case AggregationType.COUNT:
            value = count;
            break;
          case AggregationType.PERCENTILE_50:
            value = percentiles.p50;
            break;
          case AggregationType.PERCENTILE_95:
            value = percentiles.p95;
            break;
          case AggregationType.PERCENTILE_99:
            value = percentiles.p99;
            break;
          default:
            value = 0;
        }

        await this.createAggregation({
          metricName,
          period,
          periodStart,
          periodEnd,
          aggregationType: aggType,
          value,
          count,
          min,
          max,
          avg,
          sum,
          stdDev,
          percentiles,
        });
      }

      this.logger.log(
        `Aggregated ${count} metrics for ${metricName} in period ${period}`
      );
    } catch (error) {
      this.logger.error('Failed to aggregate metrics', error);
      throw error;
    }
  }

  /**
   * Cleanup old aggregations
   */
  async cleanupOldAggregations(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.aggregation.deleteMany({
      where: {
        periodStart: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} aggregations older than ${retentionDays} days`
    );
    return result.count;
  }
}
