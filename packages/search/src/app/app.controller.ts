import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './services/health.service';

/**
 * Root application controller
 */
@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Check service health and dependencies',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
        service: { type: 'string' },
        uptime: { type: 'number' },
        timestamp: { type: 'string' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'boolean' },
            searchProvider: { type: 'boolean' },
            vectorDb: { type: 'boolean', nullable: true },
          },
        },
        stats: {
          type: 'object',
          properties: {
            totalIndexed: { type: 'number' },
            totalQueries: { type: 'number' },
            vectorDbEnabled: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getHealth() {
    return this.healthService.getHealth();
  }
}
