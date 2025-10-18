import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventPublisherService } from './event-publisher.service';
import * as amqp from 'amqplib';

jest.mock('amqplib');

describe('EventPublisherService', () => {
  let service: EventPublisherService;
  let mockChannel: jest.Mocked<amqp.Channel>;
  let mockConnection: jest.Mocked<amqp.Connection>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        'rabbitmq.url': 'amqp://localhost:5672',
        'rabbitmq.exchange': 'orion.events',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockChannel = {
      assertExchange: jest.fn(),
      publish: jest.fn(),
      close: jest.fn(),
    } as any;

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
    } as any;

    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [EventPublisherService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<EventPublisherService>(EventPublisherService);
    await service.onModuleInit();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to RabbitMQ and assert exchange', async () => {
      expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('orion.events', 'topic', {
        durable: true,
      });
    });

    it('should handle connection errors gracefully', async () => {
      (amqp.connect as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EventPublisherService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const failedService = module.get<EventPublisherService>(EventPublisherService);

      await expect(failedService.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('publishUserCreated', () => {
    it('should publish UserCreated event', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const name = 'Test User';

      await service.publishUserCreated(userId, email, name);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'orion.events',
        'user.created',
        expect.any(Buffer),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: expect.any(Number),
        }
      );

      const publishedMessage = JSON.parse(
        (mockChannel.publish as jest.Mock).mock.calls[0][2].toString()
      );

      expect(publishedMessage).toMatchObject({
        eventId: expect.any(String),
        userId,
        email,
        name,
        createdAt: expect.any(String),
      });
    });

    it('should not throw if channel is unavailable', async () => {
      await service.onModuleDestroy();

      await expect(
        service.publishUserCreated('user-123', 'test@example.com', 'Test User')
      ).resolves.not.toThrow();
    });
  });

  describe('publishUserUpdated', () => {
    it('should publish UserUpdated event', async () => {
      const userId = 'user-123';
      const changes = ['name', 'bio'];

      await service.publishUserUpdated(userId, changes);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'orion.events',
        'user.updated',
        expect.any(Buffer),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: expect.any(Number),
        }
      );

      const publishedMessage = JSON.parse(
        (mockChannel.publish as jest.Mock).mock.calls[0][2].toString()
      );

      expect(publishedMessage).toMatchObject({
        eventId: expect.any(String),
        userId,
        changes,
        updatedAt: expect.any(String),
      });
    });
  });

  describe('publishUserDeleted', () => {
    it('should publish UserDeleted event', async () => {
      const userId = 'user-123';

      await service.publishUserDeleted(userId);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'orion.events',
        'user.deleted',
        expect.any(Buffer),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: expect.any(Number),
        }
      );

      const publishedMessage = JSON.parse(
        (mockChannel.publish as jest.Mock).mock.calls[0][2].toString()
      );

      expect(publishedMessage).toMatchObject({
        eventId: expect.any(String),
        userId,
        deletedAt: expect.any(String),
      });
    });
  });

  describe('publishUserVerified', () => {
    it('should publish UserVerified event', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      await service.publishUserVerified(userId, email);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'orion.events',
        'user.verified',
        expect.any(Buffer),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: expect.any(Number),
        }
      );

      const publishedMessage = JSON.parse(
        (mockChannel.publish as jest.Mock).mock.calls[0][2].toString()
      );

      expect(publishedMessage).toMatchObject({
        eventId: expect.any(String),
        userId,
        email,
        verifiedAt: expect.any(String),
      });
    });
  });

  describe('publishUserPreferencesUpdated', () => {
    it('should publish UserPreferencesUpdated event', async () => {
      const userId = 'user-123';
      const preferences = {
        notifications: { email: false },
        display: { theme: 'dark' as const },
      };

      await service.publishUserPreferencesUpdated(userId, preferences);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        'orion.events',
        'user.preferences.updated',
        expect.any(Buffer),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: expect.any(Number),
        }
      );

      const publishedMessage = JSON.parse(
        (mockChannel.publish as jest.Mock).mock.calls[0][2].toString()
      );

      expect(publishedMessage).toMatchObject({
        eventId: expect.any(String),
        userId,
        preferences,
        updatedAt: expect.any(String),
      });
    });
  });

  describe('error handling', () => {
    it('should handle publish errors gracefully', async () => {
      mockChannel.publish.mockImplementation(() => {
        throw new Error('Publish failed');
      });

      await expect(
        service.publishUserCreated('user-123', 'test@example.com', 'Test User')
      ).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close channel and connection', async () => {
      await service.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      mockChannel.close.mockRejectedValue(new Error('Close failed'));
      mockConnection.close.mockRejectedValue(new Error('Close failed'));

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
