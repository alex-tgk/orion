import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { QueryMetricsDto, MetricResponseDto } from '../dto';
import { Metric, MetricType, Prisma } from '@prisma/analytics';

/**
 * Metric Service
 * Handles metric collection and querying
 */
@Injectable()
export class MetricService {
  private readonly logger = new Logger(MetricService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a metric
   */
  async recordMetric(data: {
    name: string;
    displayName?: string;
    description?: string;
    type: MetricType;
    value: number;
    unit?: string;
    labels?: Record<string, any>;
    serviceId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<Metric> {
    try {
      const metric = await this.prisma.metric.create({
        data: {
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          type: data.type,
          value: data.value,
          unit: data.unit,
          labels: data.labels || {},
          serviceId: data.serviceId,
          userId: data.userId,
          metadata: data.metadata || {},
          tags: data.tags || [],
        },
      });

      this.logger.debug(`Metric recorded: ${metric.name} = ${metric.value}`);
      return metric;
    } catch (error) {
      this.logger.error('Failed to record metric', error);
      throw error;
    }
  }

  /**
   * Query metrics with filters
   */
  async queryMetrics(dto: QueryMetricsDto): Promise<MetricResponseDto[]> {
    const where: Prisma.MetricWhereInput = {};

    if (dto.name) where.name = { contains: dto.name };
    if (dto.type) where.type = dto.type;
    if (dto.serviceId) where.serviceId = dto.serviceId;
    if (dto.userId) where.userId = dto.userId;

    if (dto.startDate || dto.endDate) {
      where.timestamp = {};
      if (dto.startDate) where.timestamp.gte = new Date(dto.startDate);
      if (dto.endDate) where.timestamp.lte = new Date(dto.endDate);
    }

    if (dto.labels) {
      where.labels = { equals: dto.labels };
    }

    if (dto.tags && dto.tags.length > 0) {
      where.tags = { hasSome: dto.tags };
    }

    const metrics = await this.prisma.metric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: dto.limit || 100,
      skip: dto.offset || 0,
    });

    return metrics.map((metric) => ({
      id: metric.id,
      name: metric.name,
      type: metric.type as MetricType,
      value: metric.value,
      unit: metric.unit || undefined,
      labels: metric.labels as Record<string, any>,
      timestamp: metric.timestamp,
      serviceId: metric.serviceId || undefined,
      userId: metric.userId || undefined,
      tags: metric.tags,
    }));
  }

  /**
   * Get metric statistics
   */
  async getMetricStats(
    name: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  }> {
    const where: Prisma.MetricWhereInput = { name };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const result = await this.prisma.metric.aggregate({
      where,
      _count: true,
      _sum: { value: true },
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
    });

    return {
      count: result._count,
      sum: result._sum.value || 0,
      avg: result._avg.value || 0,
      min: result._min.value || 0,
      max: result._max.value || 0,
    };
  }

  /**
   * Cleanup old metrics
   */
  async cleanupOldMetrics(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.metric.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} metrics older than ${retentionDays} days`);
    return result.count;
  }
}
