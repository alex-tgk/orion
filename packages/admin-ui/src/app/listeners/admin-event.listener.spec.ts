import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AdminEventListener } from './admin-event.listener';
import { AdminEventsGateway } from '../gateways/admin-events.gateway';
import {
  ServiceHealth,
  ServiceStatus,
  SystemEvent,
  SystemEventType,
  ServiceMetrics,
  Alert,
  AlertType,
  AlertSeverity,
} from '../types/websocket-events.types';

describe('AdminEventListener', () => {
  let listener: AdminEventListener;
  let gateway: jest.Mocked<AdminEventsGateway>;

  beforeEach(async () => {
    const mockGateway = {
      broadcastServiceHealth: jest.fn(),
      broadcastSystemEvent: jest.fn(),
      broadcastMetrics: jest.fn(),
      broadcastAlert: jest.fn(),
      broadcastAlertResolved: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminEventListener,
        {
          provide: AdminEventsGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    listener = module.get<AdminEventListener>(AdminEventListener);
    gateway = module.get(AdminEventsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Listener Definition', () => {
    it('should be defined', () => {
      expect(listener).toBeDefined();
    });
  });

  describe('handleServiceHealthUpdate', () => {
    it('should broadcast service health update with healthy status', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const health: ServiceHealth = {
        serviceName: 'auth',
        status: ServiceStatus.HEALTHY,
        port: 3001,
        lastHeartbeat: new Date(),
        uptime: 3600,
        responseTime: 50,
      };

      listener.handleServiceHealthUpdate(health);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Broadcasting service health update for auth',
      );
      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith('auth', health);
    });

    it('should broadcast service health update with degraded status', () => {
      const health: ServiceHealth = {
        serviceName: 'gateway',
        status: ServiceStatus.DEGRADED,
        port: 3000,
        lastHeartbeat: new Date(),
        uptime: 1800,
        responseTime: 250,
      };

      listener.handleServiceHealthUpdate(health);

      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith('gateway', health);
    });

    it('should broadcast service health update with unhealthy status', () => {
      const health: ServiceHealth = {
        serviceName: 'cache',
        status: ServiceStatus.UNHEALTHY,
        port: 3002,
        lastHeartbeat: new Date(),
        uptime: 900,
        responseTime: 1000,
      };

      listener.handleServiceHealthUpdate(health);

      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith('cache', health);
    });

    it('should broadcast service health update with down status', () => {
      const health: ServiceHealth = {
        serviceName: 'search',
        status: ServiceStatus.DOWN,
        port: 3003,
        lastHeartbeat: new Date(Date.now() - 60000),
        uptime: 0,
      };

      listener.handleServiceHealthUpdate(health);

      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith('search', health);
    });

    it('should broadcast service health update without response time', () => {
      const health: ServiceHealth = {
        serviceName: 'notifications',
        status: ServiceStatus.HEALTHY,
        port: 3004,
        lastHeartbeat: new Date(),
        uptime: 7200,
      };

      listener.handleServiceHealthUpdate(health);

      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith(
        'notifications',
        health,
      );
    });

    it('should broadcast service health update with metadata', () => {
      const health: ServiceHealth = {
        serviceName: 'analytics',
        status: ServiceStatus.HEALTHY,
        port: 3005,
        lastHeartbeat: new Date(),
        uptime: 10800,
        metadata: {
          version: '2.0.0',
          region: 'us-east-1',
        },
      };

      listener.handleServiceHealthUpdate(health);

      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith('analytics', health);
      expect(gateway.broadcastServiceHealth).toHaveBeenCalledWith(
        'analytics',
        expect.objectContaining({
          metadata: {
            version: '2.0.0',
            region: 'us-east-1',
          },
        }),
      );
    });
  });

  describe('handleSystemEvent', () => {
    it('should broadcast service started event', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const event: SystemEvent = {
        id: 'event-123',
        type: SystemEventType.SERVICE_STARTED,
        serviceName: 'auth',
        timestamp: new Date(),
        severity: 'info',
        message: 'Service started on port 3001',
        metadata: { port: 3001 },
      };

      listener.handleSystemEvent(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Broadcasting system event: service_started from auth',
      );
      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast service error event', () => {
      const event: SystemEvent = {
        id: 'event-456',
        type: SystemEventType.SERVICE_ERROR,
        serviceName: 'gateway',
        timestamp: new Date(),
        severity: 'error',
        message: 'Database connection failed',
        metadata: {
          error: 'ConnectionError',
          details: 'Timeout after 5000ms',
        },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast request received event with user context', () => {
      const event: SystemEvent = {
        id: 'event-789',
        type: SystemEventType.REQUEST_RECEIVED,
        serviceName: 'gateway',
        timestamp: new Date(),
        severity: 'info',
        message: 'GET /api/users',
        requestId: 'req-123',
        userId: 'user-456',
        metadata: { method: 'GET', path: '/api/users' },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast request completed event', () => {
      const event: SystemEvent = {
        id: 'event-abc',
        type: SystemEventType.REQUEST_COMPLETED,
        serviceName: 'auth',
        timestamp: new Date(),
        severity: 'info',
        message: 'Request completed with status 200',
        requestId: 'req-789',
        metadata: { statusCode: 200, responseTime: 150 },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast authentication success event', () => {
      const event: SystemEvent = {
        id: 'event-def',
        type: SystemEventType.AUTHENTICATION_SUCCESS,
        serviceName: 'auth',
        timestamp: new Date(),
        severity: 'info',
        message: 'User authenticated: test@example.com',
        userId: 'user-123',
        metadata: { email: 'test@example.com' },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast authentication failure event', () => {
      const event: SystemEvent = {
        id: 'event-ghi',
        type: SystemEventType.AUTHENTICATION_FAILURE,
        serviceName: 'auth',
        timestamp: new Date(),
        severity: 'warning',
        message: 'Authentication failed: Invalid password',
        metadata: { email: 'test@example.com', reason: 'Invalid password' },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast database query event', () => {
      const event: SystemEvent = {
        id: 'event-jkl',
        type: SystemEventType.DATABASE_QUERY,
        serviceName: 'auth',
        timestamp: new Date(),
        severity: 'warning',
        message: 'Slow query detected',
        requestId: 'req-999',
        metadata: { query: 'SELECT * FROM users', duration: 1500 },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast cache hit event', () => {
      const event: SystemEvent = {
        id: 'event-mno',
        type: SystemEventType.CACHE_HIT,
        serviceName: 'cache',
        timestamp: new Date(),
        severity: 'info',
        message: 'Cache hit for key: user:123',
        requestId: 'req-111',
        metadata: { key: 'user:123' },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });

    it('should broadcast critical severity event', () => {
      const event: SystemEvent = {
        id: 'event-pqr',
        type: SystemEventType.SERVICE_ERROR,
        serviceName: 'gateway',
        timestamp: new Date(),
        severity: 'critical',
        message: 'Critical system failure',
        metadata: { component: 'loadBalancer' },
      };

      listener.handleSystemEvent(event);

      expect(gateway.broadcastSystemEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('handleMetricsUpdate', () => {
    it('should broadcast metrics update with all metric types', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
      const now = new Date();
      const metrics: ServiceMetrics = {
        serviceName: 'gateway',
        metrics: {
          requestsPerSecond: [{ timestamp: now, value: 100 }],
          errorRate: [{ timestamp: now, value: 0.01 }],
          averageResponseTime: [{ timestamp: now, value: 150 }],
          activeConnections: [{ timestamp: now, value: 50 }],
          cpuUsage: [{ timestamp: now, value: 45.5 }],
          memoryUsage: [{ timestamp: now, value: 512000000 }],
        },
      };

      listener.handleMetricsUpdate(metrics);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Broadcasting metrics update for gateway',
      );
      expect(gateway.broadcastMetrics).toHaveBeenCalledWith('gateway', metrics);
    });

    it('should broadcast metrics update without optional CPU and memory', () => {
      const now = new Date();
      const metrics: ServiceMetrics = {
        serviceName: 'auth',
        metrics: {
          requestsPerSecond: [{ timestamp: now, value: 50 }],
          errorRate: [{ timestamp: now, value: 0.001 }],
          averageResponseTime: [{ timestamp: now, value: 75 }],
          activeConnections: [{ timestamp: now, value: 25 }],
        },
      };

      listener.handleMetricsUpdate(metrics);

      expect(gateway.broadcastMetrics).toHaveBeenCalledWith('auth', metrics);
    });

    it('should broadcast metrics update with multiple data points', () => {
      const now = new Date();
      const metrics: ServiceMetrics = {
        serviceName: 'cache',
        metrics: {
          requestsPerSecond: [
            { timestamp: new Date(now.getTime() - 2000), value: 80 },
            { timestamp: new Date(now.getTime() - 1000), value: 90 },
            { timestamp: now, value: 100 },
          ],
          errorRate: [
            { timestamp: new Date(now.getTime() - 2000), value: 0.005 },
            { timestamp: new Date(now.getTime() - 1000), value: 0.008 },
            { timestamp: now, value: 0.01 },
          ],
          averageResponseTime: [
            { timestamp: new Date(now.getTime() - 2000), value: 120 },
            { timestamp: new Date(now.getTime() - 1000), value: 135 },
            { timestamp: now, value: 150 },
          ],
          activeConnections: [
            { timestamp: new Date(now.getTime() - 2000), value: 40 },
            { timestamp: new Date(now.getTime() - 1000), value: 45 },
            { timestamp: now, value: 50 },
          ],
        },
      };

      listener.handleMetricsUpdate(metrics);

      expect(gateway.broadcastMetrics).toHaveBeenCalledWith('cache', metrics);
    });
  });

  describe('handleNewAlert', () => {
    it('should broadcast high error rate alert', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const alert: Alert = {
        id: 'alert-123',
        type: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.HIGH,
        serviceName: 'auth',
        title: 'High Error Rate Detected',
        description: 'Error rate exceeded 5% threshold',
        timestamp: new Date(),
        resolved: false,
      };

      listener.handleNewAlert(alert);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Broadcasting new alert: high_error_rate (high) for auth',
      );
      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });

    it('should broadcast service down critical alert', () => {
      const alert: Alert = {
        id: 'alert-456',
        type: AlertType.SERVICE_DOWN,
        severity: AlertSeverity.CRITICAL,
        serviceName: 'gateway',
        title: 'Service Down',
        description: 'Gateway service is not responding',
        timestamp: new Date(),
        resolved: false,
      };

      listener.handleNewAlert(alert);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });

    it('should broadcast high memory alert with metadata', () => {
      const alert: Alert = {
        id: 'alert-789',
        type: AlertType.HIGH_MEMORY,
        severity: AlertSeverity.MEDIUM,
        serviceName: 'cache',
        title: 'High Memory Usage',
        description: 'Memory usage at 85%',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          memoryUsage: 0.85,
          threshold: 0.8,
        },
      };

      listener.handleNewAlert(alert);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });

    it('should broadcast high CPU alert', () => {
      const alert: Alert = {
        id: 'alert-abc',
        type: AlertType.HIGH_CPU,
        severity: AlertSeverity.MEDIUM,
        serviceName: 'analytics',
        title: 'High CPU Usage',
        description: 'CPU usage at 90%',
        timestamp: new Date(),
        resolved: false,
      };

      listener.handleNewAlert(alert);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });

    it('should broadcast slow response alert', () => {
      const alert: Alert = {
        id: 'alert-def',
        type: AlertType.SLOW_RESPONSE,
        severity: AlertSeverity.LOW,
        serviceName: 'auth',
        title: 'Slow Response Time',
        description: 'Average response time above 500ms',
        timestamp: new Date(),
        resolved: false,
      };

      listener.handleNewAlert(alert);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });

    it('should broadcast security breach alert', () => {
      const alert: Alert = {
        id: 'alert-ghi',
        type: AlertType.SECURITY_BREACH,
        severity: AlertSeverity.CRITICAL,
        serviceName: 'auth',
        title: 'Security Breach Detected',
        description: 'Multiple failed login attempts from same IP',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          ipAddress: '192.168.1.100',
          attempts: 10,
        },
      };

      listener.handleNewAlert(alert);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });

    it('should broadcast custom alert', () => {
      const alert: Alert = {
        id: 'alert-jkl',
        type: AlertType.CUSTOM,
        severity: AlertSeverity.LOW,
        serviceName: 'notifications',
        title: 'Custom Alert',
        description: 'Custom condition met',
        timestamp: new Date(),
        resolved: false,
      };

      listener.handleNewAlert(alert);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
    });
  });

  describe('handleAlertResolved', () => {
    it('should broadcast alert resolution', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      const data = {
        alertId: 'alert-123',
        resolvedAt: new Date(),
      };

      listener.handleAlertResolved(data);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Broadcasting alert resolution: alert-123',
      );
      expect(gateway.broadcastAlertResolved).toHaveBeenCalledWith('alert-123');
    });

    it('should broadcast alert resolution with different alert id', () => {
      const data = {
        alertId: 'alert-456',
        resolvedAt: new Date(),
      };

      listener.handleAlertResolved(data);

      expect(gateway.broadcastAlertResolved).toHaveBeenCalledWith('alert-456');
    });

    it('should broadcast alert resolution with past timestamp', () => {
      const data = {
        alertId: 'alert-789',
        resolvedAt: new Date(Date.now() - 3600000),
      };

      listener.handleAlertResolved(data);

      expect(gateway.broadcastAlertResolved).toHaveBeenCalledWith('alert-789');
    });
  });

  describe('Event Flow Integration', () => {
    it('should handle multiple events in sequence', () => {
      const health: ServiceHealth = {
        serviceName: 'auth',
        status: ServiceStatus.HEALTHY,
        port: 3001,
        lastHeartbeat: new Date(),
        uptime: 3600,
      };

      const event: SystemEvent = {
        id: 'event-1',
        type: SystemEventType.SERVICE_STARTED,
        serviceName: 'auth',
        timestamp: new Date(),
        severity: 'info',
        message: 'Service started',
      };

      const metrics: ServiceMetrics = {
        serviceName: 'auth',
        metrics: {
          requestsPerSecond: [{ timestamp: new Date(), value: 50 }],
          errorRate: [{ timestamp: new Date(), value: 0.001 }],
          averageResponseTime: [{ timestamp: new Date(), value: 75 }],
          activeConnections: [{ timestamp: new Date(), value: 25 }],
        },
      };

      listener.handleServiceHealthUpdate(health);
      listener.handleSystemEvent(event);
      listener.handleMetricsUpdate(metrics);

      expect(gateway.broadcastServiceHealth).toHaveBeenCalledTimes(1);
      expect(gateway.broadcastSystemEvent).toHaveBeenCalledTimes(1);
      expect(gateway.broadcastMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle alert lifecycle', () => {
      const alert: Alert = {
        id: 'alert-lifecycle',
        type: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.HIGH,
        serviceName: 'gateway',
        title: 'High Error Rate',
        description: 'Error rate too high',
        timestamp: new Date(),
        resolved: false,
      };

      const resolution = {
        alertId: 'alert-lifecycle',
        resolvedAt: new Date(),
      };

      listener.handleNewAlert(alert);
      listener.handleAlertResolved(resolution);

      expect(gateway.broadcastAlert).toHaveBeenCalledWith(alert);
      expect(gateway.broadcastAlertResolved).toHaveBeenCalledWith('alert-lifecycle');
    });
  });
});
