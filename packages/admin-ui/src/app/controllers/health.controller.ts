import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../services/health.service';
import { HealthCheckDto, AggregatedHealthDto } from '../dto/health.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get backend API health status' })
  @ApiResponse({ status: 200, description: 'Health check successful', type: HealthCheckDto })
  async getHealth(): Promise<HealthCheckDto> {
    return this.healthService.getBackendHealth();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get aggregated health status of all ORION services' })
  @ApiResponse({ status: 200, description: 'Aggregated health check successful', type: AggregatedHealthDto })
  async getAllServicesHealth(): Promise<AggregatedHealthDto> {
    return this.healthService.checkAllServices();
  }
}
