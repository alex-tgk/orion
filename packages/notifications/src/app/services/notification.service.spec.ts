import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { TemplateService } from './template.service';
import { PrismaService } from '@orion/shared';
import { RABBITMQ_CHANNEL } from '../config/rabbitmq.module';
import { NotificationType, NotificationStatus } from '../entities/notification.entity';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockChannel = {
    publish: jest.fn(),
  };

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEmailService = {
    send: jest.fn(),
  };

  const mockSmsService = {
    send: jest.fn(),
  };

  const mockTemplateService = {
    render: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'notification.rabbitmq.maxAttempts': 3,
        'notification.rabbitmq.retryDelay': [1000, 5000, 30000],
        'notification.rabbitmq.exchange': 'orion.events',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: TemplateService,
          useValue: mockTemplateService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RABBITMQ_CHANNEL,
          useValue: mockChannel,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should create and send email notification successfully', async () => {
      const mockNotification = {
        id: 'test-notification-id',
        userId: 'test-user-id',
        type: NotificationType.EMAIL,
        template: 'welcome-email',
        subject: 'Welcome!',
        body: '<p>Welcome</p>',
        recipient: 'test@example.com',
        status: NotificationStatus.QUEUED,
        metadata: { name: 'John' },
      };

      mockTemplateService.render.mockResolvedValue({
        subject: 'Welcome!',
        body: '<p>Welcome</p>',
      });

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const notificationId = await service.send({
        userId: 'test-user-id',
        type: NotificationType.EMAIL,
        template: 'welcome-email',
        recipient: 'test@example.com',
        data: { name: 'John' },
      });

      expect(notificationId).toBe('test-notification-id');
      expect(mockTemplateService.render).toHaveBeenCalledWith('welcome-email', { name: 'John' });
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          type: NotificationType.EMAIL,
          template: 'welcome-email',
          subject: 'Welcome!',
          body: '<p>Welcome</p>',
          recipient: 'test@example.com',
          status: NotificationStatus.QUEUED,
          metadata: { name: 'John' },
        },
      });
    });

    it('should handle template rendering failure', async () => {
      mockTemplateService.render.mockRejectedValue(new Error('Template not found'));

      await expect(
        service.send({
          userId: 'test-user-id',
          type: NotificationType.EMAIL,
          template: 'non-existent',
          recipient: 'test@example.com',
          data: {},
        })
      ).rejects.toThrow('Template not found');
    });
  });

  describe('processNotification', () => {
    it('should process email notification successfully', async () => {
      const mockNotification = {
        id: 'test-id',
        type: NotificationType.EMAIL,
        recipient: 'test@example.com',
        subject: 'Test',
        body: '<p>Test</p>',
        status: NotificationStatus.QUEUED,
        attempts: 0,
      };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.DELIVERED,
      });
      mockEmailService.send.mockResolvedValue(undefined);

      await service.processNotification('test-id');

      expect(mockEmailService.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          status: NotificationStatus.DELIVERED,
        }),
      });
    });

    it('should process SMS notification successfully', async () => {
      const mockNotification = {
        id: 'test-id',
        type: NotificationType.SMS,
        recipient: '+11234567890',
        body: 'Test SMS',
        status: NotificationStatus.QUEUED,
        attempts: 0,
      };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.DELIVERED,
      });
      mockSmsService.send.mockResolvedValue(undefined);

      await service.processNotification('test-id');

      expect(mockSmsService.send).toHaveBeenCalledWith({
        to: '+11234567890',
        body: 'Test SMS',
      });
    });

    it('should handle notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await service.processNotification('non-existent-id');

      expect(mockEmailService.send).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return notification status', async () => {
      const mockNotification = {
        id: 'test-id',
        status: NotificationStatus.DELIVERED,
        type: NotificationType.EMAIL,
        attempts: 1,
        lastAttempt: new Date(),
        deliveredAt: new Date(),
        error: null,
      };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);

      const status = await service.getStatus('test-id');

      expect(status).toEqual(mockNotification);
    });
  });

  describe('getHistory', () => {
    it('should return paginated notification history', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          type: NotificationType.EMAIL,
          subject: 'Test 1',
          status: NotificationStatus.DELIVERED,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
        {
          id: 'notif-2',
          type: NotificationType.EMAIL,
          subject: 'Test 2',
          status: NotificationStatus.DELIVERED,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrismaService.notification.count.mockResolvedValue(10);

      const history = await service.getHistory('test-user-id', 1, 20);

      expect(history).toEqual({
        data: mockNotifications,
        pagination: {
          page: 1,
          limit: 20,
          total: 10,
        },
      });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        select: expect.any(Object),
      });
    });

    it('should handle page 2 correctly', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(25);

      await service.getHistory('test-user-id', 2, 20);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });
  });
});
