export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  timestamp?: string;
}

export interface AggregatedHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: Record<string, ServiceHealthStatus>;
  timestamp: string;
}
