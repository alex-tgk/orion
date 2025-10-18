import { IsString, IsOptional, IsDateString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ActivityPeriod {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

/**
 * DTO for querying user activity
 */
export class QueryUserActivityDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(ActivityPeriod)
  @IsOptional()
  period?: ActivityPeriod = ActivityPeriod.DAY;

  @IsString()
  @IsOptional()
  eventName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 100;
}

/**
 * Response DTO for user analytics
 */
export class UserAnalyticsResponseDto {
  userId!: string;
  totalEvents!: number;
  lastEventAt?: Date;
  firstEventAt?: Date;
  totalSessions!: number;
  avgSessionDuration?: number;
  lastSessionAt?: Date;
  daysActive!: number;
  longestStreak!: number;
  currentStreak!: number;
  featuresUsed!: string[];
  favoriteFeatures!: Array<{
    feature: string;
    count: number;
  }>;
  peakUsageHour?: number;
  peakUsageDay?: number;
  avgLoadTime?: number;
  errorRate?: number;
}

/**
 * Response DTO for user activity timeline
 */
export class UserActivityTimelineDto {
  date!: string;
  events!: number;
  sessions!: number;
  avgSessionDuration?: number;
  uniqueFeatures!: number;
  errors!: number;
}

/**
 * Response DTO for user engagement metrics
 */
export class UserEngagementDto {
  userId!: string;
  engagementScore!: number; // 0-100
  activityLevel!: 'low' | 'medium' | 'high' | 'very_high';
  retentionRisk!: 'low' | 'medium' | 'high';
  lastSevenDaysActivity!: {
    daysActive: number;
    totalEvents: number;
    totalSessions: number;
  };
  trends!: {
    eventsChange: number; // percentage
    sessionsChange: number; // percentage
    durationChange: number; // percentage
  };
}
