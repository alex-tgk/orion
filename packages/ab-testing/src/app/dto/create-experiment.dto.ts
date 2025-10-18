import { IsString, IsEnum, IsOptional, IsNumber, IsArray, IsObject, ValidateNested, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExperimentType,
  AllocationStrategy,
  MetricType,
  MetricAggregation,
  SignificanceLevel,
} from '../interfaces/ab-testing.interface';

export class VariantConfigDto {
  @ApiProperty({ description: 'Unique variant key (e.g., control, variant_a)' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Variant display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Variant description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is this the control variant?', default: false })
  @IsOptional()
  @IsBoolean()
  isControl?: boolean;

  @ApiPropertyOptional({ description: 'Allocation weight (relative)', default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiProperty({ description: 'Variant configuration (features, settings, etc.)' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional payload to send to client' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

export class MetricConfigDto {
  @ApiProperty({ description: 'Unique metric key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Metric display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Metric description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Metric type', enum: MetricType })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ description: 'Aggregation method', enum: MetricAggregation })
  @IsEnum(MetricAggregation)
  aggregation: MetricAggregation;

  @ApiPropertyOptional({ description: 'Is this the primary success metric?', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Expected baseline value' })
  @IsOptional()
  @IsNumber()
  expectedValue?: number;

  @ApiPropertyOptional({ description: 'Target value' })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Event filters' })
  @IsOptional()
  @IsObject()
  eventFilters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'User filters' })
  @IsOptional()
  @IsObject()
  userFilters?: Record<string, any>;
}

export class TargetingRuleDto {
  @ApiProperty({ description: 'User attribute to evaluate' })
  @IsString()
  attribute: string;

  @ApiProperty({ description: 'Comparison operator', enum: ['equals', 'not_equals', 'in', 'not_in', 'contains', 'gt', 'lt', 'gte', 'lte'] })
  @IsString()
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';

  @ApiProperty({ description: 'Value to compare against' })
  value: any;
}

export class TargetingRulesDto {
  @ApiPropertyOptional({ description: 'Rules to include users', type: [TargetingRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetingRuleDto)
  includeRules?: TargetingRuleDto[];

  @ApiPropertyOptional({ description: 'Rules to exclude users', type: [TargetingRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TargetingRuleDto)
  excludeRules?: TargetingRuleDto[];
}

export class StatisticalConfigDto {
  @ApiPropertyOptional({ description: 'Significance level', enum: SignificanceLevel, default: SignificanceLevel.P_95 })
  @IsOptional()
  @IsEnum(SignificanceLevel)
  significanceLevel?: SignificanceLevel;

  @ApiPropertyOptional({ description: 'Minimum sample size', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  minimumSampleSize?: number;

  @ApiPropertyOptional({ description: 'Minimum detectable effect (0-1)', default: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumDetectable?: number;

  @ApiPropertyOptional({ description: 'Statistical power (0-1)', default: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  powerAnalysis?: number;
}

export class ScheduleConfigDto {
  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsOptional()
  startAt?: Date;

  @ApiPropertyOptional({ description: 'Scheduled end time' })
  @IsOptional()
  endAt?: Date;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class CreateExperimentDto {
  @ApiProperty({ description: 'Unique experiment key for code reference' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Experiment display name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Experiment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Hypothesis being tested' })
  @IsOptional()
  @IsString()
  hypothesis?: string;

  @ApiProperty({ description: 'Experiment type', enum: ExperimentType, default: ExperimentType.AB_TEST })
  @IsEnum(ExperimentType)
  type: ExperimentType;

  @ApiPropertyOptional({ description: 'Allocation strategy', enum: AllocationStrategy, default: AllocationStrategy.DETERMINISTIC })
  @IsOptional()
  @IsEnum(AllocationStrategy)
  allocationStrategy?: AllocationStrategy;

  @ApiPropertyOptional({ description: 'Traffic allocation (0-1)', default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  trafficAllocation?: number;

  @ApiProperty({ description: 'Experiment variants', type: [VariantConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantConfigDto)
  variants: VariantConfigDto[];

  @ApiProperty({ description: 'Metrics to track', type: [MetricConfigDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricConfigDto)
  metrics: MetricConfigDto[];

  @ApiPropertyOptional({ description: 'Targeting rules', type: TargetingRulesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TargetingRulesDto)
  targetingRules?: TargetingRulesDto;

  @ApiPropertyOptional({ description: 'Statistical configuration', type: StatisticalConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StatisticalConfigDto)
  statisticalConfig?: StatisticalConfigDto;

  @ApiPropertyOptional({ description: 'Schedule configuration', type: ScheduleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  schedule?: ScheduleConfigDto;

  @ApiPropertyOptional({ description: 'Feature flag key for integration' })
  @IsOptional()
  @IsString()
  featureFlagKey?: string;

  @ApiProperty({ description: 'Owner user ID' })
  @IsString()
  ownerId: string;

  @ApiPropertyOptional({ description: 'Team ID' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Tags for categorization' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
