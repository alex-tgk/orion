import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Dashboard')
@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get service health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('system/status')
  @ApiOperation({ summary: 'Get overall system status' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  getSystemStatus() {
    return this.appService.getSystemStatus();
  }

  @Get('services')
  @ApiOperation({ summary: 'Get all microservices status' })
  @ApiResponse({ status: 200, description: 'Services list retrieved successfully' })
  getServices() {
    return this.appService.getServices();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent system activity' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Activity log retrieved successfully' })
  getRecentActivity(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.appService.getRecentActivity(limitNumber);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats() {
    return this.appService.getStats();
  }
}
