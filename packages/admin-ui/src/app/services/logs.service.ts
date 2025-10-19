import { Injectable, Logger } from '@nestjs/common';
import { LogEntryDto, LogLevel, QueryLogsDto, LogListResponseDto, ExportLogsDto } from '../dto/log.dto';

interface CircularBuffer {
  logs: LogEntryDto[];
  maxSize: number;
  currentIndex: number;
}

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);
  private readonly logBuffer: CircularBuffer = {
    logs: [],
    maxSize: 10000, // Keep last 10k logs in memory
    currentIndex: 0,
  };

  constructor() {
    this.logger.log('LogsService initialized with circular buffer (10k entries)');
  }

  /**
   * Add a log entry to the circular buffer
   */
  addLog(log: LogEntryDto): void {
    if (this.logBuffer.logs.length < this.logBuffer.maxSize) {
      this.logBuffer.logs.push(log);
    } else {
      // Overwrite oldest log
      this.logBuffer.logs[this.logBuffer.currentIndex] = log;
      this.logBuffer.currentIndex = (this.logBuffer.currentIndex + 1) % this.logBuffer.maxSize;
    }
  }

  /**
   * Query logs with filters
   */
  queryLogs(query: QueryLogsDto): LogListResponseDto {
    let filteredLogs = [...this.logBuffer.logs];

    // Filter by service
    if (query.service) {
      filteredLogs = filteredLogs.filter((log) => log.service === query.service);
    }

    // Filter by level
    if (query.level) {
      filteredLogs = filteredLogs.filter((log) => log.level === query.level);
    }

    // Filter by time range
    if (query.startTime) {
      const startTime = new Date(query.startTime).getTime();
      filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() >= startTime);
    }

    if (query.endTime) {
      const endTime = new Date(query.endTime).getTime();
      filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp).getTime() <= endTime);
    }

    // Search in message
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredLogs = filteredLogs.filter((log) => log.message.toLowerCase().includes(searchLower));
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = filteredLogs.length;
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    // Paginate
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total,
      count: paginatedLogs.length,
      offset,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export logs to JSON or CSV
   */
  exportLogs(exportDto: ExportLogsDto): { data: string; count: number; filename: string } {
    const query: QueryLogsDto = {
      service: exportDto.service,
      level: exportDto.level,
      startTime: exportDto.startTime,
      endTime: exportDto.endTime,
      limit: 10000, // Max export limit
    };

    const result = this.queryLogs(query);

    if (exportDto.format === 'csv') {
      const csvData = this.convertToCSV(result.logs);
      return {
        data: csvData,
        count: result.count,
        filename: `logs-${new Date().toISOString()}.csv`,
      };
    } else {
      // JSON format
      const jsonData = JSON.stringify(result.logs, null, 2);
      return {
        data: jsonData,
        count: result.count,
        filename: `logs-${new Date().toISOString()}.json`,
      };
    }
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: LogEntryDto[]): string {
    const headers = ['Timestamp', 'Service', 'Level', 'Message'];
    const rows = logs.map((log) => [log.timestamp, log.service, log.level, `"${log.message.replace(/"/g, '""')}"`]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return csvContent;
  }

  /**
   * Get logs for real-time streaming
   * Returns logs since last check
   */
  getRecentLogs(sinceTimestamp?: string, limit: number = 100): LogEntryDto[] {
    let logs = [...this.logBuffer.logs];

    if (sinceTimestamp) {
      const since = new Date(sinceTimestamp).getTime();
      logs = logs.filter((log) => new Date(log.timestamp).getTime() > since);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return logs.slice(0, limit);
  }

  /**
   * Clear all logs from buffer
   */
  clearLogs(): void {
    this.logBuffer.logs = [];
    this.logBuffer.currentIndex = 0;
    this.logger.log('Log buffer cleared');
  }

  /**
   * Get buffer statistics
   */
  getStats(): { total: number; capacity: number; usage: number } {
    return {
      total: this.logBuffer.logs.length,
      capacity: this.logBuffer.maxSize,
      usage: (this.logBuffer.logs.length / this.logBuffer.maxSize) * 100,
    };
  }

  /**
   * Simulate log ingestion from PM2 (this would be called periodically)
   */
  ingestFromPM2(): void {
    // This is a placeholder - in production, this would read from PM2 log files
    // or listen to PM2 events

    const mockLogs: LogEntryDto[] = [
      {
        id: `log-${Date.now()}-1`,
        service: 'auth',
        level: LogLevel.INFO,
        message: 'User authentication successful',
        timestamp: new Date().toISOString(),
      },
      {
        id: `log-${Date.now()}-2`,
        service: 'gateway',
        level: LogLevel.DEBUG,
        message: 'Request forwarded to auth service',
        timestamp: new Date().toISOString(),
      },
    ];

    mockLogs.forEach((log) => this.addLog(log));
  }
}
