import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthAggregationService } from '../services/health-aggregation.service';
import { StatsService } from '../services/stats.service';
import { SystemOverviewDto, SystemStatsDto } from '../dto';

@ApiTags('System')
@Controller('api/system')
export class SystemController {
  private readonly logger = new Logger(SystemController.name);

  constructor(
    private readonly healthAggregationService: HealthAggregationService,
    private readonly statsService: StatsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get system overview and status' })
  @ApiResponse({ status: 200, description: 'System overview retrieved', type: SystemOverviewDto })
  async getSystemStatus(): Promise<SystemOverviewDto> {
    this.logger.log('Fetching system status');

    const healthResults = await this.healthAggregationService.checkAllServicesHealth();
    const summary = this.healthAggregationService.getHealthSummary(healthResults);

    return {
      status: summary.healthy === summary.total ? 'healthy' : summary.unhealthy > 0 ? 'degraded' : 'healthy',
      totalServices: summary.total,
      healthyServices: summary.healthy,
      degradedServices: summary.degraded,
      unhealthyServices: summary.unhealthy,
      timestamp: new Date().toISOString(),
      services: healthResults,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved', type: SystemStatsDto })
  async getSystemStats(): Promise<SystemStatsDto> {
    this.logger.log('Fetching system statistics');
    return this.statsService.getSystemStats();
  }

  @Get('health/summary')
  @ApiOperation({ summary: 'Get health summary across all services' })
  @ApiResponse({ status: 200, description: 'Health summary retrieved' })
  async getHealthSummary() {
    this.logger.log('Fetching health summary');

    const healthResults = await this.healthAggregationService.checkAllServicesHealth();
    const summary = this.healthAggregationService.getHealthSummary(healthResults);

    return {
      ...summary,
      timestamp: new Date().toISOString(),
      overallStatus: summary.healthy === summary.total ? 'healthy' : summary.unhealthy > 0 ? 'degraded' : 'warning',
    };
  }
}
