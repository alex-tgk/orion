import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as sgMail from '@sendgrid/mail';

// Mock SendGrid
jest.mock('@sendgrid/mail');

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'notification.sendgrid.apiKey': 'test-api-key',
        'notification.sendgrid.enabled': true,
        'notification.sendgrid.from': {
          email: 'noreply@orion.com',
          name: 'ORION Platform',
        },
        'notification.sendgrid.replyTo': 'support@orion.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (sgMail.send as jest.Mock) = mockSend;

      await service.send({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        }),
      );
    });

    it('should handle send failure', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('SendGrid error'));
      (sgMail.send as jest.Mock) = mockSend;

      await expect(
        service.send({
          to: 'test@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        }),
      ).rejects.toThrow('SendGrid error');
    });

    it('should not send when disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'notification.sendgrid.enabled') return false;
        return mockConfigService.get(key);
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const disabledService = module.get<EmailService>(EmailService);

      await disabledService.send({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      // Should not throw and should not call SendGrid
      expect(sgMail.send).not.toHaveBeenCalled();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(service.validateEmail('test@example.com')).toBe(true);
      expect(service.validateEmail('user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(service.validateEmail('invalid')).toBe(false);
      expect(service.validateEmail('test@')).toBe(false);
      expect(service.validateEmail('@example.com')).toBe(false);
      expect(service.validateEmail('')).toBe(false);
    });
  });
});
