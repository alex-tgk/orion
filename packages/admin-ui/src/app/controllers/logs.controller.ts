import { Controller, Get, Post, Query, Logger, HttpCode, HttpStatus, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';
import { LogsService } from '../services/logs.service';
import { QueryLogsDto, LogListResponseDto, ExportLogsDto, ExportLogsResponseDto } from '../dto/log.dto';

interface MessageEvent {
  data: string | object;
}

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  private readonly logger = new Logger(LogsController.name);

  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({ summary: 'Query logs with filters' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully', type: LogListResponseDto })
  async queryLogs(@Query() query: QueryLogsDto): Promise<LogListResponseDto> {
    return this.logsService.queryLogs(query);
  }

  @Get('stream')
  @ApiOperation({ summary: 'Server-Sent Events endpoint for real-time log streaming' })
  @ApiResponse({ status: 200, description: 'Log stream established' })
  @Sse('stream')
  streamLogs(): Observable<MessageEvent> {
    // Stream logs every 2 seconds
    return interval(2000).pipe(
      map(() => {
        const logs = this.logsService.getRecentLogs(undefined, 10);
        return {
          data: {
            logs,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export logs as JSON or CSV' })
  @ApiResponse({ status: 200, description: 'Logs exported successfully', type: ExportLogsResponseDto })
  async exportLogs(@Query() exportDto: ExportLogsDto): Promise<ExportLogsResponseDto> {
    const result = this.logsService.exportLogs(exportDto);

    return {
      format: exportDto.format || 'json',
      count: result.count,
      data: result.data,
      filename: result.filename,
      timestamp: new Date().toISOString(),
    };
  }
}
