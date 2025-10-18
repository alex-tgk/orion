// Health DTOs
export * from './health.dto';

// Metrics DTOs
export * from './metrics.dto';

// System DTOs (if they exist in separate files)
export interface SystemOverviewDto {
  status: string;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  timestamp: string;
  services?: any[];
}

export interface SystemStatsDto {
  uptime: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  timestamp: string;
}

export interface ServiceDetailsDto {
  serviceName: string;
  status: string;
  host: string;
  port: number;
  version: string;
  uptime: number;
  lastHealthCheck: string;
}

export interface ServiceMetricsDto {
  serviceName: string;
  timestamp: string;
  timeRange: number;
  [key: string]: any;
}
