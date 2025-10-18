import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { HealthAggregationService } from '../services/health-aggregation.service';
import { AlertService } from '../services/alert.service';
import {
  ServiceHealth,
  SystemHealthOverview,
  ServiceDependencyGraph,
  HealthHistoryResponse,
  AlertsListResponse,
  AlertSeverity,
  AlertStatus,
} from '../dto/health.dto';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthAggregationService: HealthAggregationService,
    private readonly alertService: AlertService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get system health overview' })
  @ApiResponse({ status: 200, description: 'System health overview', type: SystemHealthOverview })
  async getSystemHealthOverview(): Promise<SystemHealthOverview> {
    this.logger.log('Fetching system health overview');
    return this.healthAggregationService.getSystemHealthOverview();
  }

  @Get('services')
  @ApiOperation({ summary: 'Get health status of all services' })
  @ApiResponse({ status: 200, description: 'Health status of all services', type: [ServiceHealth] })
  async getAllServicesHealth(): Promise<ServiceHealth[]> {
    this.logger.log('Fetching health status of all services');
    return this.healthAggregationService.checkAllServicesHealth();
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get health status of a specific service' })
  @ApiParam({ name: 'serviceName', description: 'Service name' })
  @ApiResponse({ status: 200, description: 'Service health status', type: ServiceHealth })
  async getServiceHealth(@Param('serviceName') serviceName: string): Promise<ServiceHealth> {
    this.logger.log(`Fetching health status for service: ${serviceName}`);
    return this.healthAggregationService.checkServiceHealth(serviceName);
  }

  @Get('history/:serviceName')
  @ApiOperation({ summary: 'Get historical health data for a service' })
  @ApiParam({ name: 'serviceName', description: 'Service name' })
  @ApiQuery({ name: 'timeRange', description: 'Time range in hours', required: false, example: 24 })
  @ApiResponse({ status: 200, description: 'Historical health data', type: HealthHistoryResponse })
  async getServiceHealthHistory(
    @Param('serviceName') serviceName: string,
    @Query('timeRange') timeRange?: number,
  ): Promise<HealthHistoryResponse> {
    const timeRangeHours = timeRange ? parseInt(timeRange.toString(), 10) : 24;
    this.logger.log(`Fetching health history for ${serviceName}, timeRange: ${timeRangeHours}h`);

    return this.healthAggregationService.getHealthHistory(serviceName, timeRangeHours);
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'Get service dependency graph' })
  @ApiResponse({ status: 200, description: 'Service dependency graph', type: ServiceDependencyGraph })
  async getServiceDependencyGraph(): Promise<ServiceDependencyGraph> {
    this.logger.log('Fetching service dependency graph');
    return this.healthAggregationService.getServiceDependencyGraph();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get alerts with optional filters' })
  @ApiQuery({ name: 'severity', enum: AlertSeverity, required: false })
  @ApiQuery({ name: 'status', enum: AlertStatus, required: false })
  @ApiQuery({ name: 'serviceName', required: false })
  @ApiResponse({ status: 200, description: 'Alerts list', type: AlertsListResponse })
  async getAlerts(
    @Query('severity') severity?: AlertSeverity,
    @Query('status') status?: AlertStatus,
    @Query('serviceName') serviceName?: string,
  ): Promise<AlertsListResponse> {
    this.logger.log(
      `Fetching alerts - severity: ${severity}, status: ${status}, service: ${serviceName}`
    );

    return this.alertService.getAlerts(severity, status, serviceName);
  }

  @Get('alerts/counts')
  @ApiOperation({ summary: 'Get alert counts by severity' })
  @ApiResponse({ status: 200, description: 'Alert counts' })
  async getAlertCounts() {
    this.logger.log('Fetching alert counts');
    return this.alertService.getAlertCounts();
  }
}
