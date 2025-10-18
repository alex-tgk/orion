import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserEventsConsumer } from './user-events.consumer';
import { NotificationService } from '../services/notification.service';
import { PreferencesService } from '../services/preferences.service';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.module';
import { NotificationType } from '../entities/notification.entity';
import {
  UserCreatedEvent,
  UserVerifiedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
} from '@orion/shared';

describe('UserEventsConsumer', () => {
  let consumer: UserEventsConsumer;

  const mockChannel = {
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockNotificationService = {
    send: jest.fn(),
  };

  const mockPreferencesService = {
    isEnabled: jest.fn(),
    deletePreferences: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'notification.app.frontendUrl') {
        return 'https://orion.com';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventsConsumer,
        {
          provide: RABBITMQ_CHANNEL,
          useValue: mockChannel,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: PreferencesService,
          useValue: mockPreferencesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    consumer = module.get<UserEventsConsumer>(UserEventsConsumer);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handleUserCreated', () => {
    it('should send welcome email when enabled', async () => {
      const event: UserCreatedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'newuser@example.com',
        name: 'John Doe',
        createdAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockNotificationService.send.mockResolvedValue('notification-id');

      await consumer['handleUserCreated'](event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith(
        'user-123',
        'email',
        'welcome'
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.EMAIL,
        template: 'welcome-email',
        recipient: 'newuser@example.com',
        data: expect.objectContaining({
          name: 'John Doe',
          email: 'newuser@example.com',
          verificationUrl: expect.stringContaining('/verify-email'),
          loginUrl: expect.stringContaining('/login'),
        }),
      });
    });

    it('should not send email when welcome emails are disabled', async () => {
      const event: UserCreatedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'newuser@example.com',
        name: 'John Doe',
        createdAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(false);

      await consumer['handleUserCreated'](event);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('handleUserVerified', () => {
    it('should send verification confirmation email when enabled', async () => {
      const event: UserVerifiedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'user@example.com',
        verifiedAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockNotificationService.send.mockResolvedValue('notification-id');

      await consumer['handleUserVerified'](event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith(
        'user-123',
        'email',
        'accountUpdates'
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.EMAIL,
        template: 'account-verified',
        recipient: 'user@example.com',
        data: expect.objectContaining({
          email: 'user@example.com',
          verifiedAt: event.verifiedAt,
          loginUrl: expect.stringContaining('/login'),
        }),
      });
    });

    it('should not send email when account updates are disabled', async () => {
      const event: UserVerifiedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'user@example.com',
        verifiedAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(false);

      await consumer['handleUserVerified'](event);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('handleUserUpdated', () => {
    it('should not send notification if email was not changed', async () => {
      const event: UserUpdatedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        changes: ['name', 'phone'],
        updatedAt: new Date(),
      };

      await consumer['handleUserUpdated'](event);

      expect(mockPreferencesService.isEnabled).not.toHaveBeenCalled();
      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });

    it('should check preferences when email was changed', async () => {
      const event: UserUpdatedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        changes: ['email', 'name'],
        updatedAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);

      await consumer['handleUserUpdated'](event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith(
        'user-123',
        'email',
        'accountUpdates'
      );

      // Note: Current implementation doesn't send notification because new email is not available
      // This is logged as a warning in the implementation
    });

    it('should not send notification when account updates are disabled', async () => {
      const event: UserUpdatedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        changes: ['email'],
        updatedAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(false);

      await consumer['handleUserUpdated'](event);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('handleUserDeleted', () => {
    it('should delete user preferences', async () => {
      const event: UserDeletedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        deletedAt: new Date(),
      };

      mockPreferencesService.deletePreferences.mockResolvedValue(undefined);

      await consumer['handleUserDeleted'](event);

      expect(mockPreferencesService.deletePreferences).toHaveBeenCalledWith('user-123');
    });

    it('should not send notification (user is deleted)', async () => {
      const event: UserDeletedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        deletedAt: new Date(),
      };

      mockPreferencesService.deletePreferences.mockResolvedValue(undefined);

      await consumer['handleUserDeleted'](event);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('startConsuming', () => {
    it('should set up RabbitMQ consumer on module init', async () => {
      await consumer.onModuleInit();

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'notification.user-events',
        expect.any(Function),
        { noAck: false }
      );
    });

    it('should acknowledge message after successful processing', async () => {
      const event: UserCreatedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(event)),
        fields: {
          routingKey: 'user.created',
        },
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);

      // Simulate consumer callback
      let consumerCallback: any;
      mockChannel.consume.mockImplementation((_queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      await consumer.onModuleInit();

      // Call the consumer callback
      await consumerCallback(mockMessage);

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should nack and requeue message on processing error', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ invalid: 'data' })),
        fields: {
          routingKey: 'user.created',
        },
      };

      mockPreferencesService.isEnabled.mockRejectedValue(new Error('Database error'));

      // Simulate consumer callback
      let consumerCallback: any;
      mockChannel.consume.mockImplementation((_queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      await consumer.onModuleInit();

      // Call the consumer callback
      await consumerCallback(mockMessage);

      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
    });

    it('should handle all user event types', async () => {
      const events = [
        {
          routingKey: 'user.created',
          event: {
            eventId: 'e1',
            userId: 'u1',
            email: 'test@example.com',
            name: 'Test',
            createdAt: new Date(),
          },
        },
        {
          routingKey: 'user.verified',
          event: {
            eventId: 'e2',
            userId: 'u1',
            email: 'test@example.com',
            verifiedAt: new Date(),
          },
        },
        {
          routingKey: 'user.updated',
          event: {
            eventId: 'e3',
            userId: 'u1',
            changes: ['name'],
            updatedAt: new Date(),
          },
        },
        {
          routingKey: 'user.deleted',
          event: {
            eventId: 'e4',
            userId: 'u1',
            deletedAt: new Date(),
          },
        },
      ];

      let consumerCallback: any;
      mockChannel.consume.mockImplementation((_queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      await consumer.onModuleInit();

      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockPreferencesService.deletePreferences.mockResolvedValue(undefined);

      for (const { routingKey, event } of events) {
        const mockMessage = {
          content: Buffer.from(JSON.stringify(event)),
          fields: { routingKey },
        };

        await consumerCallback(mockMessage);

        expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
      }
    });

    it('should handle unknown event types', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ eventId: 'test' })),
        fields: {
          routingKey: 'user.unknown-event',
        },
      };

      let consumerCallback: any;
      mockChannel.consume.mockImplementation((_queue, callback) => {
        consumerCallback = callback;
        return Promise.resolve();
      });

      await consumer.onModuleInit();

      // Should acknowledge even unknown events
      await consumerCallback(mockMessage);

      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });
  });
});
