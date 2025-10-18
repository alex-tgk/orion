/**
 * A/B Testing Interfaces
 * Type-safe interfaces for experiment management
 */

export interface IExperimentConfig {
  key: string;
  name: string;
  description?: string;
  hypothesis?: string;
  type: ExperimentType;
  allocationStrategy: AllocationStrategy;
  trafficAllocation: number;
  variants: IVariantConfig[];
  metrics: IMetricConfig[];
  targetingRules?: ITargetingRules;
  statisticalConfig?: IStatisticalConfig;
  schedule?: IScheduleConfig;
  featureFlagKey?: string;
  ownerId: string;
  teamId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface IVariantConfig {
  key: string;
  name: string;
  description?: string;
  isControl?: boolean;
  weight?: number;
  config: Record<string, any>;
  payload?: Record<string, any>;
}

export interface IMetricConfig {
  key: string;
  name: string;
  description?: string;
  type: MetricType;
  aggregation: MetricAggregation;
  isPrimary?: boolean;
  expectedValue?: number;
  targetValue?: number;
  eventFilters?: Record<string, any>;
  userFilters?: Record<string, any>;
}

export interface ITargetingRules {
  includeRules?: ITargetingRule[];
  excludeRules?: ITargetingRule[];
}

export interface ITargetingRule {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
}

export interface IStatisticalConfig {
  significanceLevel: SignificanceLevel;
  minimumSampleSize: number;
  minimumDetectable: number;
  powerAnalysis: number;
}

export interface IScheduleConfig {
  startAt?: Date;
  endAt?: Date;
  duration?: number;
}

export interface IAssignmentContext {
  userId: string;
  deviceId?: string;
  sessionId?: string;
  attributes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface IVariantAssignment {
  experimentKey: string;
  variantKey: string;
  variantConfig: Record<string, any>;
  variantPayload?: Record<string, any>;
  isOverride: boolean;
  assignedAt: Date;
}

export interface IMetricTracking {
  experimentKey: string;
  metricKey: string;
  value: number;
  userId: string;
  context?: Record<string, any>;
}

export interface IExperimentResults {
  experimentKey: string;
  status: string;
  variants: IVariantResults[];
  primaryMetric?: IMetricResults;
  secondaryMetrics?: IMetricResults[];
  analysis: IStatisticalAnalysis;
  recommendation?: string;
  recommendedAction?: string;
}

export interface IVariantResults {
  variantKey: string;
  variantName: string;
  isControl: boolean;
  assignmentCount: number;
  conversionCount: number;
  conversionRate: number;
  metrics: {
    [metricKey: string]: IMetricResults;
  };
  confidenceInterval?: [number, number];
  standardError?: number;
}

export interface IMetricResults {
  metricKey: string;
  metricName: string;
  value: number;
  sampleSize: number;
  mean?: number;
  median?: number;
  standardDeviation?: number;
  variance?: number;
  min?: number;
  max?: number;
}

export interface IStatisticalAnalysis {
  analysisType: string;
  pValue?: number;
  confidenceLevel?: number;
  isSignificant: boolean;
  effectSize?: number;
  relativeUplift?: number;
  absoluteUplift?: number;
  winnerVariant?: string;
  probabilityToBeBest?: number;
  expectedLoss?: number;
}

export interface IBucketingResult {
  bucketValue: number;
  isIncluded: boolean;
  variantKey?: string;
  reason?: string;
}

// Enums
export enum ExperimentType {
  AB_TEST = 'AB_TEST',
  MULTIVARIATE = 'MULTIVARIATE',
  MULTI_ARMED_BANDIT = 'MULTI_ARMED_BANDIT',
  SEQUENTIAL = 'SEQUENTIAL',
}

export enum ExperimentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
  ARCHIVED = 'ARCHIVED',
}

export enum AllocationStrategy {
  RANDOM = 'RANDOM',
  DETERMINISTIC = 'DETERMINISTIC',
  WEIGHTED = 'WEIGHTED',
  ADAPTIVE = 'ADAPTIVE',
}

export enum MetricType {
  CONVERSION = 'CONVERSION',
  REVENUE = 'REVENUE',
  ENGAGEMENT = 'ENGAGEMENT',
  CUSTOM = 'CUSTOM',
}

export enum MetricAggregation {
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  COUNT = 'COUNT',
  UNIQUE_COUNT = 'UNIQUE_COUNT',
  PERCENTILE = 'PERCENTILE',
}

export enum SignificanceLevel {
  P_90 = 'P_90',
  P_95 = 'P_95',
  P_99 = 'P_99',
  P_999 = 'P_999',
}

export enum VariantStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  WINNER = 'WINNER',
  LOSER = 'LOSER',
}
