import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MetricsService } from '../services/metrics.service';
import {
  MetricQueryResult,
  ServiceMetrics,
  AvailableMetric,
  PromQLQuery,
  BatchQueryRequest,
  MetricLabels,
  AlertRule,
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  ExportRequest,
  ExportResult,
} from '../dto/metrics.dto';

@ApiTags('Metrics')
@Controller('api/metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  // In-memory storage for alert rules (in production, use database)
  private readonly alertRules = new Map<string, AlertRule>();

  constructor(private readonly metricsService: MetricsService) {}

  @Get('query')
  @ApiOperation({ summary: 'Execute custom PromQL query' })
  @ApiQuery({ name: 'promql', description: 'PromQL query string', required: true })
  @ApiQuery({ name: 'start', description: 'Start time (RFC3339 or Unix timestamp)', required: false })
  @ApiQuery({ name: 'end', description: 'End time (RFC3339 or Unix timestamp)', required: false })
  @ApiQuery({ name: 'step', description: 'Query resolution step', required: false, example: '15s' })
  @ApiResponse({ status: 200, description: 'Query result', type: MetricQueryResult })
  async executeQuery(
    @Query('promql') promql: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('step') step?: string,
  ): Promise<MetricQueryResult> {
    if (!promql) {
      throw new BadRequestException('PromQL query is required');
    }

    this.logger.log(`Executing PromQL query: ${promql}`);

    try {
      // In production, this would proxy to Prometheus
      // For now, return mock data
      return this.mockPrometheusQuery(promql, start, end, step);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Query execution failed: ${message}`);

      return {
        status: 'error',
        data: { resultType: 'vector' as any, result: [] },
        error: message,
      };
    }
  }

  @Post('query/batch')
  @ApiOperation({ summary: 'Execute multiple PromQL queries' })
  @ApiBody({ type: BatchQueryRequest })
  @ApiResponse({ status: 200, description: 'Batch query results', type: [MetricQueryResult] })
  async executeBatchQueries(@Body() batchRequest: BatchQueryRequest): Promise<MetricQueryResult[]> {
    this.logger.log(`Executing ${batchRequest.queries.length} queries in batch`);

    const results = await Promise.all(
      batchRequest.queries.map(query =>
        this.mockPrometheusQuery(query.query, query.start?.toString(), query.end?.toString(), query.step)
      )
    );

    return results;
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get metrics for a specific service' })
  @ApiParam({ name: 'serviceName', description: 'Service name' })
  @ApiQuery({ name: 'timeRange', description: 'Time range in minutes', required: false, example: 60 })
  @ApiResponse({ status: 200, description: 'Service metrics', type: ServiceMetrics })
  async getServiceMetrics(
    @Param('serviceName') serviceName: string,
    @Query('timeRange') timeRange?: number,
  ): Promise<ServiceMetrics> {
    this.logger.log(`Fetching metrics for service: ${serviceName}`);

    const metrics = await this.metricsService.getServiceMetrics(serviceName);

    if (!metrics) {
      throw new NotFoundException(`Metrics not available for service '${serviceName}'`);
    }

    return metrics as any;
  }

  @Get('available')
  @ApiOperation({ summary: 'List all available metrics' })
  @ApiResponse({ status: 200, description: 'Available metrics', type: [AvailableMetric] })
  async getAvailableMetrics(): Promise<AvailableMetric[]> {
    this.logger.log('Fetching available metrics');

    // In production, this would query Prometheus for available metrics
    return this.mockAvailableMetrics();
  }

  @Get('labels')
  @ApiOperation({ summary: 'Get available labels for a metric' })
  @ApiQuery({ name: 'metric', description: 'Metric name', required: true })
  @ApiResponse({ status: 200, description: 'Metric labels', type: MetricLabels })
  async getMetricLabels(@Query('metric') metric: string): Promise<MetricLabels> {
    if (!metric) {
      throw new BadRequestException('Metric name is required');
    }

    this.logger.log(`Fetching labels for metric: ${metric}`);

    // Mock labels for demonstration
    return {
      metric,
      labelNames: ['service', 'method', 'status', 'instance'],
      labelValues: {
        service: ['gateway', 'auth', 'user', 'notifications'],
        method: ['GET', 'POST', 'PUT', 'DELETE'],
        status: ['200', '404', '500'],
        instance: ['localhost:3000', 'localhost:3001'],
      },
    };
  }

  // Alert Rules Management

  @Post('alerts')
  @ApiOperation({ summary: 'Create new alert rule' })
  @ApiBody({ type: CreateAlertRuleDto })
  @ApiResponse({ status: 201, description: 'Alert rule created', type: AlertRule })
  async createAlertRule(@Body() createDto: CreateAlertRuleDto): Promise<AlertRule> {
    this.logger.log(`Creating alert rule: ${createDto.name}`);

    const alertRule: AlertRule = {
      id: this.generateAlertRuleId(),
      ...createDto,
      labels: createDto.labels || {},
      annotations: createDto.annotations || {},
      enabled: createDto.enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.alertRules.set(alertRule.id, alertRule);

    return alertRule;
  }

  @Get('alerts')
  @ApiOperation({ summary: 'List all alert rules' })
  @ApiResponse({ status: 200, description: 'Alert rules', type: [AlertRule] })
  async listAlertRules(): Promise<AlertRule[]> {
    this.logger.log('Fetching alert rules');
    return Array.from(this.alertRules.values());
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  @ApiParam({ name: 'id', description: 'Alert rule ID' })
  @ApiResponse({ status: 200, description: 'Alert rule', type: AlertRule })
  async getAlertRule(@Param('id') id: string): Promise<AlertRule> {
    const rule = this.alertRules.get(id);

    if (!rule) {
      throw new NotFoundException(`Alert rule ${id} not found`);
    }

    return rule;
  }

  @Put('alerts/:id')
  @ApiOperation({ summary: 'Update alert rule' })
  @ApiParam({ name: 'id', description: 'Alert rule ID' })
  @ApiBody({ type: UpdateAlertRuleDto })
  @ApiResponse({ status: 200, description: 'Alert rule updated', type: AlertRule })
  async updateAlertRule(
    @Param('id') id: string,
    @Body() updateDto: UpdateAlertRuleDto,
  ): Promise<AlertRule> {
    const existing = this.alertRules.get(id);

    if (!existing) {
      throw new NotFoundException(`Alert rule ${id} not found`);
    }

    const updated: AlertRule = {
      ...existing,
      ...updateDto,
      updatedAt: new Date().toISOString(),
    };

    this.alertRules.set(id, updated);
    this.logger.log(`Updated alert rule: ${id}`);

    return updated;
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete alert rule' })
  @ApiParam({ name: 'id', description: 'Alert rule ID' })
  @ApiResponse({ status: 204, description: 'Alert rule deleted' })
  async deleteAlertRule(@Param('id') id: string): Promise<void> {
    if (!this.alertRules.has(id)) {
      throw new NotFoundException(`Alert rule ${id} not found`);
    }

    this.alertRules.delete(id);
    this.logger.log(`Deleted alert rule: ${id}`);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export metrics data' })
  @ApiBody({ type: ExportRequest })
  @ApiResponse({ status: 200, description: 'Export result', type: ExportResult })
  async exportMetrics(@Body() exportRequest: ExportRequest): Promise<ExportResult> {
    this.logger.log(`Exporting metrics in ${exportRequest.format} format`);

    // Mock export functionality
    const data = JSON.stringify({
      queries: exportRequest.queries,
      timeRange: exportRequest.timeRange,
      exportedAt: new Date().toISOString(),
    });

    return {
      format: exportRequest.format,
      data: Buffer.from(data).toString('base64'),
      fileName: `metrics-export-${Date.now()}.${exportRequest.format}`,
      mimeType: this.getMimeType(exportRequest.format),
      size: data.length,
    };
  }

  // Helper methods

  private generateAlertRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      json: 'application/json',
      png: 'image/png',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
    };

    return mimeTypes[format] || 'application/octet-stream';
  }

  private mockPrometheusQuery(
    query: string,
    start?: string,
    end?: string,
    step?: string,
  ): MetricQueryResult {
    // Mock Prometheus response
    const now = Date.now();
    const points = 100;
    const interval = 60000; // 1 minute

    const values: [number, string][] = [];
    for (let i = 0; i < points; i++) {
      const timestamp = (now - (points - i) * interval) / 1000;
      const value = (Math.random() * 100 + 50).toFixed(2);
      values.push([timestamp, value]);
    }

    return {
      status: 'success',
      data: {
        resultType: 'matrix' as any,
        result: [
          {
            metric: { __name__: query, service: 'gateway' },
            values,
          },
        ],
      },
    };
  }

  private mockAvailableMetrics(): AvailableMetric[] {
    return [
      {
        name: 'http_requests_total',
        type: 'counter' as any,
        help: 'Total HTTP requests',
        labels: ['service', 'method', 'status'],
        services: ['gateway', 'auth', 'user'],
      },
      {
        name: 'http_request_duration_seconds',
        type: 'histogram' as any,
        help: 'HTTP request duration in seconds',
        labels: ['service', 'method'],
        services: ['gateway', 'auth', 'user'],
      },
      {
        name: 'process_resident_memory_bytes',
        type: 'gauge' as any,
        help: 'Process resident memory in bytes',
        labels: ['service'],
        services: ['gateway', 'auth', 'user', 'notifications'],
      },
      {
        name: 'process_cpu_seconds_total',
        type: 'counter' as any,
        help: 'Total CPU time used',
        labels: ['service'],
        services: ['gateway', 'auth', 'user', 'notifications'],
      },
    ];
  }
}
