import { IsString, IsOptional, IsEnum, IsDateString, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  SUMMARY = 'SUMMARY',
}

export enum AggregationPeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum AggregationType {
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  COUNT = 'COUNT',
  PERCENTILE_50 = 'PERCENTILE_50',
  PERCENTILE_95 = 'PERCENTILE_95',
  PERCENTILE_99 = 'PERCENTILE_99',
}

/**
 * DTO for querying metrics
 */
export class QueryMetricsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(MetricType)
  @IsOptional()
  type?: MetricType;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 100;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;
}

/**
 * DTO for querying aggregated metrics
 */
export class QueryAggregationDto {
  @IsString()
  metricName!: string;

  @IsEnum(AggregationPeriod)
  period!: AggregationPeriod;

  @IsEnum(AggregationType)
  aggregationType!: AggregationType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsObject()
  @IsOptional()
  dimensions?: Record<string, any>;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 100;
}

/**
 * Response DTO for metric
 */
export class MetricResponseDto {
  id!: string;
  name!: string;
  type!: MetricType;
  value!: number;
  unit?: string;
  labels?: Record<string, any>;
  timestamp!: Date;
  serviceId?: string;
  userId?: string;
  tags?: string[];
}

/**
 * Response DTO for aggregated metric
 */
export class AggregationResponseDto {
  id!: string;
  metricName!: string;
  period!: AggregationPeriod;
  periodStart!: Date;
  periodEnd!: Date;
  aggregationType!: AggregationType;
  value!: number;
  count!: number;
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  stdDev?: number;
  percentiles?: Record<string, number>;
  dimensions?: Record<string, any>;
}

/**
 * DTO for dashboard summary
 */
export class DashboardQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  serviceId?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}

/**
 * Response DTO for dashboard data
 */
export class DashboardResponseDto {
  summary!: {
    totalEvents: number;
    totalUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    errorRate: number;
  };

  topEvents!: Array<{
    eventName: string;
    count: number;
    trend: number; // percentage change
  }>;

  userActivity!: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    events: number;
  }>;

  servicePerformance!: Array<{
    serviceId: string;
    avgLatency: number;
    errorRate: number;
    requestsPerSecond: number;
  }>;

  costs?: {
    total: number;
    currency: string;
    breakdown: Array<{
      resourceType: string;
      amount: number;
    }>;
  };
}
