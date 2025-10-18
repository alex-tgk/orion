import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AdminEventsGateway } from './admin-events.gateway';
import { SubscriptionManagerService } from '../services/subscription-manager.service';
import { AuthenticatedSocket } from '../guards/ws-jwt.guard';
import {
  SubscribeServiceHealthDto,
  SubscribeSystemEventsDto,
  SubscribeMetricsDto,
  SubscribeAlertsDto,
  RequestMetricsDto,
  ResolveAlertDto,
} from '../dto/websocket-events.dto';
import {
  ServiceHealth,
  ServiceStatus,
  SystemEvent,
  SystemEventType,
  ServiceMetrics,
  Alert,
  AlertType,
  AlertSeverity,
  EventFilters,
  AlertFilters,
} from '../types/websocket-events.types';

describe('AdminEventsGateway', () => {
  let gateway: AdminEventsGateway;
  let subscriptionManager: jest.Mocked<SubscriptionManagerService>;
  let mockServer: jest.Mocked<Server>;
  let mockClient: jest.Mocked<AuthenticatedSocket>;

  beforeEach(async () => {
    const mockSubscriptionManager = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      getServiceHealthSubscribers: jest.fn().mockReturnValue([]),
      getSystemEventSubscribers: jest.fn().mockReturnValue([]),
      getMetricsSubscribers: jest.fn().mockReturnValue([]),
      getAlertSubscribers: jest.fn().mockReturnValue([]),
      getClientSubscriptions: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({
        totalClients: 0,
        totalSubscriptions: 0,
        byType: { 'service-health': 0, 'system-events': 0, metrics: 0, alerts: 0 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminEventsGateway,
        { provide: SubscriptionManagerService, useValue: mockSubscriptionManager },
      ],
    }).compile();

    gateway = module.get<AdminEventsGateway>(AdminEventsGateway);
    subscriptionManager = module.get(SubscriptionManagerService);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: { sockets: new Map() },
    } as unknown as jest.Mocked<Server>;

    gateway.server = mockServer;

    mockClient = {
      id: 'test-client-id',
      emit: jest.fn(),
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    } as unknown as jest.Mocked<AuthenticatedSocket>;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should handle client connection', async () => {
    await gateway.handleConnection(mockClient);
    expect(mockClient.emit).toHaveBeenCalledWith('connection:authenticated', mockClient.user.id);
  });

  it('should handle client disconnection', async () => {
    await gateway.handleDisconnect(mockClient);
    expect(subscriptionManager.unsubscribeAll).toHaveBeenCalledWith(mockClient.id);
  });

  it('should broadcast service health update', () => {
    const health: ServiceHealth = {
      serviceName: 'auth',
      status: ServiceStatus.HEALTHY,
      port: 3001,
      lastHeartbeat: new Date(),
      uptime: 3600,
    };
    subscriptionManager.getServiceHealthSubscribers.mockReturnValue(['client-1']);
    gateway.broadcastServiceHealth('auth', health);
    expect(mockServer.to).toHaveBeenCalledWith('client-1');
  });
});
