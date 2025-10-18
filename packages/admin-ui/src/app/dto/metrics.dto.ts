import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsArray, IsOptional, IsBoolean, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

export enum PromQLResultType {
  MATRIX = 'matrix',
  VECTOR = 'vector',
  SCALAR = 'scalar',
  STRING = 'string',
}

export class DataPoint {
  @ApiProperty({ description: 'Timestamp (Unix time in milliseconds)' })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: 'Metric value' })
  @IsNumber()
  value: number;
}

export class MetricData {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MetricType, description: 'Metric type' })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ description: 'Current value' })
  @IsNumber()
  current: number;

  @ApiProperty({ description: 'Average value' })
  @IsNumber()
  average: number;

  @ApiProperty({ description: 'Minimum value' })
  @IsNumber()
  min: number;

  @ApiProperty({ description: 'Maximum value' })
  @IsNumber()
  max: number;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Time series data points', type: [DataPoint] })
  @ValidateNested({ each: true })
  @Type(() => DataPoint)
  @IsArray()
  timeSeries: DataPoint[];
}

export class ServiceMetrics {
  @ApiProperty({ description: 'Service name' })
  @IsString()
  serviceName: string;

  @ApiProperty({ description: 'Timestamp' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'Time range in minutes' })
  @IsNumber()
  timeRange: number;

  @ApiProperty({ description: 'CPU metrics', type: MetricData })
  @ValidateNested()
  @Type(() => MetricData)
  cpu: MetricData;

  @ApiProperty({ description: 'Memory metrics', type: MetricData })
  @ValidateNested()
  @Type(() => MetricData)
  memory: MetricData;

  @ApiProperty({ description: 'Request rate metrics', type: MetricData })
  @ValidateNested()
  @Type(() => MetricData)
  requestRate: MetricData;

  @ApiProperty({ description: 'Error rate metrics', type: MetricData })
  @ValidateNested()
  @Type(() => MetricData)
  errorRate: MetricData;

  @ApiProperty({ description: 'Response time metrics', type: MetricData })
  @ValidateNested()
  @Type(() => MetricData)
  responseTime: MetricData;

  @ApiProperty({ description: 'Active connections', type: MetricData })
  @ValidateNested()
  @Type(() => MetricData)
  activeConnections: MetricData;

  @ApiPropertyOptional({ description: 'Custom metrics' })
  @IsOptional()
  custom?: Record<string, MetricData>;
}

export class MetricResult {
  @ApiProperty({ description: 'Metric labels' })
  @IsObject()
  metric: Record<string, string>;

  @ApiPropertyOptional({ description: 'Time series values for range queries', type: [[Number, String]] })
  @IsOptional()
  values?: [number, string][];

  @ApiPropertyOptional({ description: 'Single value for instant queries', type: [Number, String] })
  @IsOptional()
  value?: [number, string];
}

export class MetricQueryResult {
  @ApiProperty({ description: 'Query status', enum: ['success', 'error'] })
  @IsEnum(['success', 'error'])
  status: 'success' | 'error';

  @ApiProperty({
    description: 'Query result data',
    type: 'object',
    properties: {
      resultType: { enum: Object.values(PromQLResultType) },
      result: { type: 'array', items: { $ref: '#/components/schemas/MetricResult' } },
    },
  })
  data: {
    resultType: PromQLResultType;
    result: MetricResult[];
  };

  @ApiPropertyOptional({ description: 'Error message if status is error' })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiPropertyOptional({ description: 'Query warnings', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warnings?: string[];
}

export class AvailableMetric {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: MetricType, description: 'Metric type' })
  @IsEnum(MetricType)
  type: MetricType;

  @ApiProperty({ description: 'Metric help text' })
  @IsString()
  help: string;

  @ApiProperty({ description: 'Available labels', type: [String] })
  @IsArray()
  @IsString({ each: true })
  labels: string[];

  @ApiProperty({ description: 'Services exposing this metric', type: [String] })
  @IsArray()
  @IsString({ each: true })
  services: string[];
}

export class PromQLQuery {
  @ApiProperty({ description: 'PromQL query string' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Start time (RFC3339 or Unix timestamp)' })
  @IsOptional()
  start?: string | number;

  @ApiPropertyOptional({ description: 'End time (RFC3339 or Unix timestamp)' })
  @IsOptional()
  end?: string | number;

  @ApiPropertyOptional({ description: 'Query resolution step (e.g., "15s", "1m")' })
  @IsString()
  @IsOptional()
  step?: string;

  @ApiPropertyOptional({ description: 'Timeout in seconds' })
  @IsNumber()
  @IsOptional()
  timeout?: number;
}

export class BatchQueryRequest {
  @ApiProperty({ description: 'Array of PromQL queries', type: [PromQLQuery] })
  @ValidateNested({ each: true })
  @Type(() => PromQLQuery)
  @IsArray()
  queries: PromQLQuery[];
}

export class MetricLabels {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Available label names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  labelNames: string[];

  @ApiProperty({ description: 'Label values by label name' })
  @IsObject()
  labelValues: Record<string, string[]>;
}

export enum AlertOperator {
  GT = '>',
  LT = '<',
  EQ = '==',
  NE = '!=',
  GTE = '>=',
  LTE = '<=',
}

export class AlertRule {
  @ApiProperty({ description: 'Alert rule ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Alert rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Alert rule description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'PromQL query' })
  @IsString()
  promql: string;

  @ApiProperty({ description: 'Alert severity', enum: ['info', 'warning', 'error', 'critical'] })
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity: 'info' | 'warning' | 'error' | 'critical';

  @ApiProperty({ description: 'Alert duration in seconds' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Alert threshold value' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ enum: AlertOperator, description: 'Comparison operator' })
  @IsEnum(AlertOperator)
  operator: AlertOperator;

  @ApiProperty({ description: 'Alert labels' })
  @IsObject()
  labels: Record<string, string>;

  @ApiProperty({ description: 'Alert annotations' })
  @IsObject()
  annotations: Record<string, string>;

  @ApiProperty({ description: 'Whether alert is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Last triggered timestamp' })
  @IsDateString()
  @IsOptional()
  lastTriggered?: string;
}

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Alert rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Alert rule description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'PromQL query' })
  @IsString()
  promql: string;

  @ApiProperty({ description: 'Alert severity', enum: ['info', 'warning', 'error', 'critical'] })
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity: 'info' | 'warning' | 'error' | 'critical';

  @ApiProperty({ description: 'Alert duration in seconds' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: 'Alert threshold value' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ enum: AlertOperator, description: 'Comparison operator' })
  @IsEnum(AlertOperator)
  operator: AlertOperator;

  @ApiPropertyOptional({ description: 'Alert labels' })
  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Alert annotations' })
  @IsObject()
  @IsOptional()
  annotations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether alert is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: 'Alert rule name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Alert rule description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'PromQL query' })
  @IsString()
  @IsOptional()
  promql?: string;

  @ApiPropertyOptional({ description: 'Alert severity', enum: ['info', 'warning', 'error', 'critical'] })
  @IsEnum(['info', 'warning', 'error', 'critical'])
  @IsOptional()
  severity?: 'info' | 'warning' | 'error' | 'critical';

  @ApiPropertyOptional({ description: 'Alert duration in seconds' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Alert threshold value' })
  @IsNumber()
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional({ enum: AlertOperator, description: 'Comparison operator' })
  @IsEnum(AlertOperator)
  @IsOptional()
  operator?: AlertOperator;

  @ApiPropertyOptional({ description: 'Alert labels' })
  @IsObject()
  @IsOptional()
  labels?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Alert annotations' })
  @IsObject()
  @IsOptional()
  annotations?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether alert is enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class ChartConfig {
  @ApiProperty({ description: 'Chart type', enum: ['line', 'area', 'bar', 'stacked', 'heatmap'] })
  @IsEnum(['line', 'area', 'bar', 'stacked', 'heatmap'])
  type: 'line' | 'area' | 'bar' | 'stacked' | 'heatmap';

  @ApiProperty({ description: 'Chart title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Chart width in pixels' })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Chart height in pixels' })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Show legend' })
  @IsBoolean()
  @IsOptional()
  showLegend?: boolean;

  @ApiPropertyOptional({ description: 'Custom colors', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];
}

export class ExportRequest {
  @ApiProperty({ description: 'Export format', enum: ['csv', 'json', 'png', 'svg', 'pdf'] })
  @IsEnum(['csv', 'json', 'png', 'svg', 'pdf'])
  format: 'csv' | 'json' | 'png' | 'svg' | 'pdf';

  @ApiProperty({ description: 'PromQL queries to export', type: [PromQLQuery] })
  @ValidateNested({ each: true })
  @Type(() => PromQLQuery)
  @IsArray()
  queries: PromQLQuery[];

  @ApiProperty({
    description: 'Time range for export',
    type: 'object',
    properties: {
      start: { type: 'string' },
      end: { type: 'string' },
    },
  })
  timeRange: {
    start: string;
    end: string;
  };

  @ApiPropertyOptional({
    description: 'Export options',
    type: 'object',
    properties: {
      includeLabels: { type: 'boolean' },
      resolution: { type: 'number' },
      chartConfig: { $ref: '#/components/schemas/ChartConfig' },
    },
  })
  @IsOptional()
  options?: {
    includeLabels?: boolean;
    resolution?: number;
    chartConfig?: ChartConfig;
  };
}

export class ExportResult {
  @ApiProperty({ description: 'Export format' })
  @IsString()
  format: string;

  @ApiProperty({ description: 'Exported data (base64 for binary formats)' })
  @IsString()
  data: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  size: number;
}
