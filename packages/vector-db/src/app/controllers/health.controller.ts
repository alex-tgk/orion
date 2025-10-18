import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../services/health.service';
import { VectorHealthResponseDto } from '../dto/vector-response.dto';

/**
 * Health Controller
 * Provides health check endpoints for monitoring
 */
@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health status of the vector database service',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed',
    type: VectorHealthResponseDto,
  })
  async checkHealth(): Promise<VectorHealthResponseDto> {
    this.logger.log('Health check requested');
    return this.healthService.checkHealth();
  }
}
