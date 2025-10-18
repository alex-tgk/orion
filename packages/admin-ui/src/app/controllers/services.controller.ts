import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ObservabilityService } from '../services/observability.service';
import { HealthAggregationService } from '../services/health-aggregation.service';
import { MetricsService } from '../services/metrics.service';
import {
  ServicesListDto,
  ServiceHealthDto,
  ServiceStatus,
} from '../dto/service-health.dto';
import { ServiceMetricsDto } from '../dto/service-metrics.dto';

@ApiTags('Services')
@Controller('api/services')
export class ServicesController {
  private readonly logger = new Logger(ServicesController.name);

  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly healthAggregationService: HealthAggregationService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all services' })
  @ApiResponse({ status: 200, description: 'Services list retrieved', type: ServicesListDto })
  async listServices(): Promise<ServicesListDto> {
    this.logger.log('Fetching services list');
    return this.observabilityService.getServicesList();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get service details' })
  @ApiParam({ name: 'name', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Service details retrieved', type: ServiceHealthDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceDetails(@Param('name') name: string): Promise<ServiceHealthDto> {
    this.logger.log(`Fetching details for service: ${name}`);
    const service = await this.observabilityService.getServiceHealth(name);

    if (service.status === ServiceStatus.UNKNOWN && service.error) {
      throw new NotFoundException(`Service '${name}' not found`);
    }

    return service;
  }

  @Get(':name/health')
  @ApiOperation({ summary: 'Get service health status' })
  @ApiParam({ name: 'name', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Health status retrieved', type: ServiceHealthDto })
  async getServiceHealth(@Param('name') name: string): Promise<ServiceHealthDto> {
    this.logger.log(`Checking health for service: ${name}`);
    return this.healthAggregationService.checkServiceHealth(name);
  }

  @Get(':name/metrics')
  @ApiOperation({ summary: 'Get service metrics' })
  @ApiParam({ name: 'name', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved', type: ServiceMetricsDto })
  @ApiResponse({ status: 404, description: 'Metrics not available' })
  async getServiceMetrics(@Param('name') name: string): Promise<ServiceMetricsDto> {
    this.logger.log(`Fetching metrics for service: ${name}`);
    const metrics = await this.metricsService.getServiceMetrics(name);

    if (!metrics) {
      throw new NotFoundException(`Metrics not available for service '${name}'`);
    }

    return metrics;
  }
}
