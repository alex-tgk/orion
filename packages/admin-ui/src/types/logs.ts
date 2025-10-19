/**
 * Log types for the admin UI
 * These mirror the backend DTOs from log.dto.ts
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export interface LogEntry {
  id: string;
  service: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

export interface LogQueryParams {
  service?: string;
  level?: LogLevel;
  startTime?: string;
  endTime?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogListResponse {
  logs: LogEntry[];
  total: number;
  count: number;
  offset: number;
  timestamp: string;
}

export interface ExportLogsParams {
  format?: 'json' | 'csv';
  service?: string;
  level?: LogLevel;
  startTime?: string;
  endTime?: string;
}

export interface ExportLogsResponse {
  format: string;
  count: number;
  data: string;
  filename: string;
  timestamp: string;
}

export interface LogStreamEvent {
  logs: LogEntry[];
  timestamp: string;
}

export type TimeRange = '1h' | '24h' | '7d' | 'custom';

export interface LogFiltersState {
  services: string[];
  levels: LogLevel[];
  timeRange: TimeRange;
  customStartTime?: string;
  customEndTime?: string;
  searchQuery: string;
}
