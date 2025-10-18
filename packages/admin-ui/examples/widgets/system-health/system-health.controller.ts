import { Controller, Get, Query, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SystemHealthService } from './system-health.service';
import { SystemHealthDto } from './dto/system-health.dto';
import { WidgetConfigDto } from './dto/widget-config.dto';

@ApiTags('System Health Widget')
@Controller('widgets/system-health')
@ApiBearerAuth()
export class SystemHealthController {
  private readonly logger = new Logger(SystemHealthController.name);

  constructor(private readonly healthService: SystemHealthService) {}

  @Get('data')
  @ApiOperation({
    summary: 'Get current system health metrics',
    description: 'Returns real-time CPU, memory, and disk usage statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'System health data',
    type: SystemHealthDto,
  })
  @ApiQuery({
    name: 'includeHistory',
    required: false,
    type: Boolean,
    description: 'Include historical data points',
  })
  async getData(
    @Query('includeHistory') includeHistory = false,
  ): Promise<SystemHealthDto> {
    this.logger.log('Fetching system health data');
    return this.healthService.getCurrentHealth(includeHistory);
  }

  @Get('config')
  @ApiOperation({
    summary: 'Get widget configuration schema',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration schema',
  })
  async getConfigSchema() {
    return this.healthService.getConfigSchema();
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get historical health data',
  })
  @ApiQuery({
    name: 'duration',
    required: false,
    type: Number,
    description: 'Duration in minutes (default: 60)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical health data',
  })
  async getHistory(@Query('duration') duration = 60) {
    this.logger.log(`Fetching ${duration} minutes of history`);
    return this.healthService.getHistory(duration);
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get active health alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Active alerts',
  })
  async getAlerts() {
    return this.healthService.getActiveAlerts();
  }
}
