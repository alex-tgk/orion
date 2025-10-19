/**
 * Service status types
 */
export type ServiceStatus = 'online' | 'offline' | 'degraded' | 'starting' | 'stopping';

/**
 * Service health check status
 */
export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

/**
 * Service information from backend
 */
export interface Service {
  id: string;
  name: string;
  displayName: string;
  status: ServiceStatus;
  port: number;
  pid?: number;
  uptime: number;
  version: string;
  instances: number;
  cpu: number;
  memory: number;
  memoryMB: number;
  restartCount: number;
  lastRestart?: string;
  lastChecked: string;
  healthStatus: HealthStatus;
  responseTime?: number;
  requestsPerMin?: number;
  errorRate?: number;
  url?: string;
}

/**
 * Service metrics over time
 */
export interface ServiceMetrics {
  serviceId: string;
  timestamp: string;
  cpu: number;
  memory: number;
  responseTime: number;
  requestCount: number;
  errorCount: number;
}

/**
 * PM2 process information
 */
export interface PM2Process {
  pm_id: number;
  name: string;
  namespace?: string;
  version?: string;
  mode: 'fork' | 'cluster';
  pid: number;
  uptime: number;
  status: 'online' | 'stopped' | 'stopping' | 'waiting restart' | 'launching' | 'errored';
  restart_count: number;
  cpu: number;
  memory: number;
  memoryMB: number;
  instances: number;
  script: string;
  port?: number;
  created_at: number;
  pm2_env?: {
    unstable_restarts: number;
    restart_time: number;
    status: string;
    pm_uptime: number;
    axm_monitor?: Record<string, unknown>;
    pm_err_log_path: string;
    pm_out_log_path: string;
  };
}

/**
 * PM2 log entry
 */
export interface PM2LogEntry {
  timestamp: string;
  type: 'out' | 'err';
  message: string;
  process_id: number;
  process_name: string;
}

/**
 * Health check result
 */
export interface HealthCheck {
  service: string;
  status: HealthStatus;
  responseTime: number;
  timestamp: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }[];
  dependencies?: {
    name: string;
    status: 'connected' | 'disconnected' | 'degraded';
    responseTime?: number;
    message?: string;
  }[];
}

/**
 * Overall system health
 */
export interface SystemHealth {
  status: HealthStatus;
  services: {
    [key: string]: HealthCheck;
  };
  infrastructure: {
    database: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      connections?: number;
    };
    redis: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      memory?: number;
    };
    rabbitmq: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
      queues?: number;
    };
  };
  timestamp: string;
}

/**
 * WebSocket events
 */
export interface ServiceHealthEvent {
  type: 'service-health';
  serviceId: string;
  status: ServiceStatus;
  healthStatus: HealthStatus;
  metrics: {
    cpu: number;
    memory: number;
    responseTime?: number;
  };
  timestamp: string;
}

export interface PM2UpdateEvent {
  type: 'pm2-update';
  process: PM2Process;
  timestamp: string;
}

export type WebSocketEvent = ServiceHealthEvent | PM2UpdateEvent;

/**
 * Action responses
 */
export interface ServiceActionResponse {
  success: boolean;
  message: string;
  serviceId: string;
  action: 'restart' | 'stop' | 'start';
  timestamp: string;
}

export interface PM2ActionResponse {
  success: boolean;
  message: string;
  pm_id: number;
  action: 'restart' | 'reload' | 'stop' | 'start';
  timestamp: string;
}
