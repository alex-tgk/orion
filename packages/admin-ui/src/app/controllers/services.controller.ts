import { Controller, Get, Post, Param, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ServicesService } from '../services/services.service';
import { ServiceDto, ServiceListResponseDto, ServiceActionDto, ServiceMetricsDto } from '../dto/service.dto';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  private readonly logger = new Logger(ServicesController.name);

  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all ORION services with health status' })
  @ApiResponse({ status: 200, description: 'Services list retrieved successfully', type: ServiceListResponseDto })
  async listServices(): Promise<ServiceListResponseDto> {
    const services = await this.servicesService.getAllServices();

    const online = services.filter((s) => s.status === 'online').length;
    const offline = services.filter((s) => s.status === 'offline').length;

    return {
      services,
      total: services.length,
      online,
      offline,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service details by ID' })
  @ApiParam({ name: 'id', description: 'Service ID (e.g., auth, gateway, ai-wrapper)' })
  @ApiResponse({ status: 200, description: 'Service details retrieved successfully', type: ServiceDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getService(@Param('id') id: string): Promise<ServiceDto> {
    return this.servicesService.getService(id);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get service metrics (CPU, memory, uptime)' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service metrics retrieved successfully', type: ServiceMetricsDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceMetrics(@Param('id') id: string): Promise<ServiceMetricsDto> {
    const service = await this.servicesService.getService(id);
    return service.metrics || { cpu: 0, memory: 0, uptime: 0 };
  }

  @Post(':id/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a service via PM2' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service restart initiated', type: ServiceActionDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async restartService(@Param('id') id: string): Promise<ServiceActionDto> {
    const result = await this.servicesService.restartService(id);

    return {
      action: 'restart',
      serviceId: id,
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a service via PM2' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service stop initiated', type: ServiceActionDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async stopService(@Param('id') id: string): Promise<ServiceActionDto> {
    const result = await this.servicesService.stopService(id);

    return {
      action: 'stop',
      serviceId: id,
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a service via PM2' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service start initiated', type: ServiceActionDto })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async startService(@Param('id') id: string): Promise<ServiceActionDto> {
    const result = await this.servicesService.startService(id);

    return {
      action: 'start',
      serviceId: id,
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }
}
