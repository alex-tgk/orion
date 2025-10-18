/**
 * Shared A/B Testing Types
 */

export enum ExperimentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
  ARCHIVED = 'ARCHIVED',
}

export enum MetricType {
  CONVERSION = 'CONVERSION',
  REVENUE = 'REVENUE',
  ENGAGEMENT = 'ENGAGEMENT',
  CUSTOM = 'CUSTOM',
}

export interface Experiment {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  type: string;
  variants: Variant[];
  metrics: Metric[];
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface Variant {
  id: string;
  key: string;
  name: string;
  description?: string;
  isControl: boolean;
  weight: number;
  config: Record<string, any>;
  assignmentCount: number;
  conversionCount: number;
  conversionRate?: number;
}

export interface Metric {
  id: string;
  key: string;
  name: string;
  type: MetricType;
  isPrimary: boolean;
  expectedValue?: number;
  targetValue?: number;
}

export interface ExperimentResults {
  experimentKey: string;
  status: string;
  variants: VariantResults[];
  primaryMetric?: MetricResults;
  analysis: StatisticalAnalysis;
  recommendation?: string;
}

export interface VariantResults {
  variantKey: string;
  variantName: string;
  isControl: boolean;
  assignmentCount: number;
  conversionCount: number;
  conversionRate: number;
  confidenceInterval?: [number, number];
}

export interface MetricResults {
  metricKey: string;
  metricName: string;
  value: number;
  sampleSize: number;
}

export interface StatisticalAnalysis {
  analysisType: string;
  pValue?: number;
  confidenceLevel?: number;
  isSignificant: boolean;
  effectSize?: number;
  relativeUplift?: number;
  absoluteUplift?: number;
  winnerVariant?: string;
}
