import { Controller, Get, Post, Param, Logger, HttpCode, HttpStatus, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PM2Service } from '../services/pm2.service';
import { PM2ProcessDto, PM2ProcessListDto, PM2LogsDto, PM2ActionResponseDto } from '../dto/pm2.dto';

@ApiTags('PM2')
@Controller('pm2')
export class PM2Controller {
  private readonly logger = new Logger(PM2Controller.name);

  constructor(private readonly pm2Service: PM2Service) {}

  @Get('processes')
  @ApiOperation({ summary: 'Get all PM2 processes' })
  @ApiResponse({ status: 200, description: 'PM2 processes retrieved successfully', type: PM2ProcessListDto })
  async listProcesses(): Promise<PM2ProcessListDto> {
    return this.pm2Service.listProcesses();
  }

  @Get('process/:id')
  @ApiOperation({ summary: 'Get PM2 process details by ID' })
  @ApiParam({ name: 'id', description: 'PM2 process ID', type: Number })
  @ApiResponse({ status: 200, description: 'PM2 process details retrieved successfully', type: PM2ProcessDto })
  @ApiResponse({ status: 404, description: 'PM2 process not found' })
  async getProcess(@Param('id', ParseIntPipe) id: number): Promise<PM2ProcessDto> {
    return this.pm2Service.getProcess(id);
  }

  @Post(':id/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restart a PM2 process' })
  @ApiParam({ name: 'id', description: 'PM2 process ID', type: Number })
  @ApiResponse({ status: 200, description: 'PM2 process restart initiated', type: PM2ActionResponseDto })
  async restartProcess(@Param('id', ParseIntPipe) id: number): Promise<PM2ActionResponseDto> {
    const process = await this.pm2Service.getProcess(id);
    const result = await this.pm2Service.restartProcess(id);

    return {
      action: 'restart',
      processId: id,
      processName: process.name,
      success: result.success,
      message: result.message,
    };
  }

  @Post(':id/reload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reload a PM2 process (zero-downtime restart)' })
  @ApiParam({ name: 'id', description: 'PM2 process ID', type: Number })
  @ApiResponse({ status: 200, description: 'PM2 process reload initiated', type: PM2ActionResponseDto })
  async reloadProcess(@Param('id', ParseIntPipe) id: number): Promise<PM2ActionResponseDto> {
    const process = await this.pm2Service.getProcess(id);
    const result = await this.pm2Service.reloadProcess(id);

    return {
      action: 'reload',
      processId: id,
      processName: process.name,
      success: result.success,
      message: result.message,
    };
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop a PM2 process' })
  @ApiParam({ name: 'id', description: 'PM2 process ID', type: Number })
  @ApiResponse({ status: 200, description: 'PM2 process stop initiated', type: PM2ActionResponseDto })
  async stopProcess(@Param('id', ParseIntPipe) id: number): Promise<PM2ActionResponseDto> {
    const process = await this.pm2Service.getProcess(id);
    const result = await this.pm2Service.stopProcess(id);

    return {
      action: 'stop',
      processId: id,
      processName: process.name,
      success: result.success,
      message: result.message,
    };
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a PM2 process' })
  @ApiParam({ name: 'id', description: 'PM2 process ID', type: Number })
  @ApiResponse({ status: 200, description: 'PM2 process start initiated', type: PM2ActionResponseDto })
  async startProcess(@Param('id', ParseIntPipe) id: number): Promise<PM2ActionResponseDto> {
    const process = await this.pm2Service.getProcess(id);
    const result = await this.pm2Service.startProcess(id);

    return {
      action: 'start',
      processId: id,
      processName: process.name,
      success: result.success,
      message: result.message,
    };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get PM2 process logs' })
  @ApiParam({ name: 'id', description: 'PM2 process ID', type: Number })
  @ApiQuery({ name: 'lines', description: 'Number of log lines to retrieve', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'PM2 process logs retrieved successfully', type: PM2LogsDto })
  async getProcessLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('lines', new ParseIntPipe({ optional: true })) lines?: number,
  ): Promise<PM2LogsDto> {
    return this.pm2Service.getProcessLogs(id, lines || 100);
  }
}
