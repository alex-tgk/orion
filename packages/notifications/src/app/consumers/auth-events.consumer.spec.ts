import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthEventsConsumer } from './auth-events.consumer';
import { NotificationService } from '../services/notification.service';
import { PreferencesService } from '../services/preferences.service';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.module';
import { NotificationType } from '../entities/notification.entity';
import {
  PasswordResetRequestedEvent,
  PasswordChangedEvent,
  SuspiciousLoginEvent,
} from '@orion/shared';

describe('AuthEventsConsumer', () => {
  let consumer: AuthEventsConsumer;

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
        AuthEventsConsumer,
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

    consumer = module.get<AuthEventsConsumer>(AuthEventsConsumer);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handlePasswordResetRequested', () => {
    it('should send password reset email when enabled', async () => {
      const event: PasswordResetRequestedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        resetToken: 'reset-token-abc',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        requestedAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockNotificationService.send.mockResolvedValue('notification-id');

      // Call the private method through reflection or test the public flow
      await consumer['handlePasswordResetRequested'](event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith(
        'user-123',
        'email',
        'passwordReset'
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.EMAIL,
        template: 'password-reset',
        recipient: 'test@example.com',
        data: expect.objectContaining({
          email: 'test@example.com',
          resetUrl: expect.stringContaining('reset-password?token=reset-token-abc'),
          expiresIn: expect.stringContaining('minutes'),
        }),
      });
    });

    it('should not send email when disabled in preferences', async () => {
      const event: PasswordResetRequestedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        resetToken: 'reset-token-abc',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        requestedAt: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(false);

      await consumer['handlePasswordResetRequested'](event);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('handlePasswordChanged', () => {
    it('should send email notification when enabled', async () => {
      const event: PasswordChangedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        changedAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockNotificationService.send.mockResolvedValue('notification-id');

      await consumer['handlePasswordChanged'](event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith(
        'user-123',
        'email',
        'securityAlerts'
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.EMAIL,
        template: 'password-changed',
        recipient: 'test@example.com',
        data: expect.objectContaining({
          email: 'test@example.com',
          changedAt: event.changedAt,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          supportUrl: expect.stringContaining('/support'),
        }),
      });
    });

    it('should check SMS preferences but not send (phone number not available)', async () => {
      const event: PasswordChangedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        changedAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockPreferencesService.isEnabled
        .mockResolvedValueOnce(false) // email disabled
        .mockResolvedValueOnce(true); // sms enabled

      await consumer['handlePasswordChanged'](event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith(
        'user-123',
        'sms',
        'securityAlerts'
      );

      // Email not sent because disabled
      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('handleSuspiciousLogin', () => {
    it('should send security alert email when enabled', async () => {
      const event: SuspiciousLoginEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '203.0.113.1',
        location: 'Unknown Location',
        userAgent: 'Mozilla/5.0',
        reason: 'Login from new location',
        timestamp: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockNotificationService.send.mockResolvedValue('notification-id');

      await consumer['handleSuspiciousLogin'](event);

      expect(mockNotificationService.send).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.EMAIL,
        template: 'suspicious-login',
        recipient: 'test@example.com',
        data: expect.objectContaining({
          email: 'test@example.com',
          ipAddress: '203.0.113.1',
          location: 'Unknown Location',
          userAgent: 'Mozilla/5.0',
          reason: 'Login from new location',
          timestamp: event.timestamp,
          securityUrl: expect.stringContaining('/security'),
          supportUrl: expect.stringContaining('/support'),
        }),
      });
    });

    it('should not send notifications when preferences are disabled', async () => {
      const event: SuspiciousLoginEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '203.0.113.1',
        location: 'Unknown Location',
        userAgent: 'Mozilla/5.0',
        reason: 'Login from new location',
        timestamp: new Date(),
      };

      mockPreferencesService.isEnabled.mockResolvedValue(false);

      await consumer['handleSuspiciousLogin'](event);

      expect(mockNotificationService.send).not.toHaveBeenCalled();
    });
  });

  describe('startConsuming', () => {
    it('should set up RabbitMQ consumer on module init', async () => {
      await consumer.onModuleInit();

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'notification.auth-events',
        expect.any(Function),
        { noAck: false }
      );
    });

    it('should acknowledge message after successful processing', async () => {
      const event: PasswordResetRequestedEvent = {
        eventId: 'event-123',
        userId: 'user-123',
        email: 'test@example.com',
        resetToken: 'token',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        requestedAt: new Date(),
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(event)),
        fields: {
          routingKey: 'auth.password-reset-requested',
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
          routingKey: 'auth.password-reset-requested',
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

    it('should handle unknown event types', async () => {
      const mockMessage = {
        content: Buffer.from(JSON.stringify({ eventId: 'test' })),
        fields: {
          routingKey: 'auth.unknown-event',
        },
      };

      let consumerCallback: any;
      mockChannel.consume.mockImplementation((queue, callback) => {
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
