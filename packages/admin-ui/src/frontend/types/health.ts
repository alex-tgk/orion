export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum HealthCheckStatus {
  PASS = 'pass',
  WARN = 'warn',
  FAIL = 'fail',
}

export interface HealthCheck {
  name: string;
  status: HealthCheckStatus;
  message?: string;
  timestamp: string;
  responseTime?: number;
}

export interface ServiceHealth {
  serviceName: string;
  status: ServiceStatus;
  uptime: number;
  lastCheckTimestamp: string;
  responseTime: number;
  version: string;
  dependencies: string[];
  checks: HealthCheck[];
  error?: string;
}

export interface SystemHealthOverview {
  overallStatus: ServiceStatus;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  activeAlerts: number;
  criticalAlerts: number;
  timestamp: string;
}

export interface DependencyNode {
  id: string;
  serviceName: string;
  status: ServiceStatus;
  type: 'service' | 'database' | 'external';
  position?: { x: number; y: number };
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  type: 'sync' | 'async' | 'data';
}

export interface ServiceDependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface HealthHistoryDataPoint {
  timestamp: string;
  status: ServiceStatus;
  responseTime: number;
  uptime: number;
}

export interface HealthHistoryResponse {
  serviceName: string;
  timeRangeHours: number;
  data: HealthHistoryDataPoint[];
  averageUptime: number;
  incidentCount: number;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export interface Alert {
  id: string;
  serviceName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}
