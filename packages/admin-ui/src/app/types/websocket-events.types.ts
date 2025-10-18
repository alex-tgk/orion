/**
 * WebSocket Event Types for ORION Admin UI
 * Comprehensive type definitions for real-time communication
 */

/**
 * Service Health Status
 */
export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  DOWN = 'down',
}

export interface ServiceHealth {
  serviceName: string;
  status: ServiceStatus;
  port: number;
  lastHeartbeat: Date;
  uptime: number; // in seconds
  responseTime?: number; // in ms
  metadata?: Record<string, unknown>;
}

/**
 * System Event Types
 */
export enum SystemEventType {
  SERVICE_STARTED = 'service_started',
  SERVICE_STOPPED = 'service_stopped',
  SERVICE_ERROR = 'service_error',
  REQUEST_RECEIVED = 'request_received',
  REQUEST_COMPLETED = 'request_completed',
  REQUEST_FAILED = 'request_failed',
  DATABASE_QUERY = 'database_query',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  AUTHENTICATION_SUCCESS = 'authentication_success',
  AUTHENTICATION_FAILURE = 'authentication_failure',
  AUTHORIZATION_DENIED = 'authorization_denied',
}

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  serviceName: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
}

/**
 * Metrics Data
 */
export interface MetricValue {
  timestamp: Date;
  value: number;
}

export interface ServiceMetrics {
  serviceName: string;
  metrics: {
    requestsPerSecond: MetricValue[];
    errorRate: MetricValue[];
    averageResponseTime: MetricValue[];
    activeConnections: MetricValue[];
    cpuUsage?: MetricValue[];
    memoryUsage?: MetricValue[];
  };
}

/**
 * Alert Types
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertType {
  SERVICE_DOWN = 'service_down',
  HIGH_ERROR_RATE = 'high_error_rate',
  SLOW_RESPONSE = 'slow_response',
  HIGH_MEMORY = 'high_memory',
  HIGH_CPU = 'high_cpu',
  SECURITY_BREACH = 'security_breach',
  CUSTOM = 'custom',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  serviceName: string;
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket Client-to-Server Events
 */
export interface ClientToServerEvents {
  // Subscription management
  'subscribe:service-health': (serviceName?: string) => void;
  'unsubscribe:service-health': (serviceName?: string) => void;
  'subscribe:system-events': (filters?: EventFilters) => void;
  'unsubscribe:system-events': () => void;
  'subscribe:metrics': (serviceName?: string) => void;
  'unsubscribe:metrics': (serviceName?: string) => void;
  'subscribe:alerts': (filters?: AlertFilters) => void;
  'unsubscribe:alerts': () => void;

  // Request current state
  'request:service-health': (serviceName?: string) => void;
  'request:system-events': (filters?: EventFilters) => void;
  'request:metrics': (serviceName: string, timeRange?: TimeRange) => void;
  'request:alerts': (filters?: AlertFilters) => void;

  // Alert management
  'resolve-alert': (alertId: string) => void;
}

/**
 * WebSocket Server-to-Client Events
 */
export interface ServerToClientEvents {
  // Health updates
  'service-health:update': (data: ServiceHealth) => void;
  'service-health:list': (data: ServiceHealth[]) => void;

  // System events
  'system-event': (event: SystemEvent) => void;
  'system-events:list': (events: SystemEvent[]) => void;

  // Metrics updates
  'metrics:update': (metrics: ServiceMetrics) => void;

  // Alerts
  'alert:new': (alert: Alert) => void;
  'alert:updated': (alert: Alert) => void;
  'alert:resolved': (alertId: string) => void;
  'alerts:list': (alerts: Alert[]) => void;

  // Connection status
  'connection:authenticated': (userId: string) => void;
  'connection:error': (error: WebSocketError) => void;

  // Subscription confirmations
  'subscription:confirmed': (subscription: SubscriptionInfo) => void;
  'subscription:removed': (subscription: SubscriptionInfo) => void;
}

/**
 * Filter Types
 */
export interface EventFilters {
  types?: SystemEventType[];
  serviceNames?: string[];
  severities?: SystemEvent['severity'][];
  startTime?: Date;
  endTime?: Date;
}

export interface AlertFilters {
  types?: AlertType[];
  severities?: AlertSeverity[];
  serviceNames?: string[];
  resolved?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Subscription Management
 */
export interface SubscriptionInfo {
  type: 'service-health' | 'system-events' | 'metrics' | 'alerts';
  serviceName?: string;
  filters?: EventFilters | AlertFilters;
}

/**
 * Error Handling
 */
export interface WebSocketError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Connection State
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}
