import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

// Mock Twilio
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test-sid' }),
    },
  }));
});

describe('SmsService', () => {
  let service: SmsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'notification.twilio.accountSid': 'test-account-sid',
        'notification.twilio.authToken': 'test-auth-token',
        'notification.twilio.from': '+11234567890',
        'notification.twilio.enabled': true,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct E.164 phone numbers', () => {
      expect(service.validatePhoneNumber('+11234567890')).toBe(true);
      expect(service.validatePhoneNumber('+442071234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(service.validatePhoneNumber('1234567890')).toBe(false);
      expect(service.validatePhoneNumber('+0123456789')).toBe(false);
      expect(service.validatePhoneNumber('invalid')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format phone number to E.164', () => {
      expect(service.formatPhoneNumber('1234567890')).toBe('+11234567890');
      expect(service.formatPhoneNumber('+11234567890')).toBe('+11234567890');
    });

    it('should use custom country code', () => {
      expect(service.formatPhoneNumber('1234567890', '+44')).toBe('+441234567890');
    });
  });

  describe('send', () => {
    it('should send SMS successfully', async () => {
      await expect(
        service.send({
          to: '+11234567890',
          body: 'Test message',
        }),
      ).resolves.not.toThrow();
    });

    it('should reject invalid phone numbers', async () => {
      await expect(
        service.send({
          to: 'invalid-number',
          body: 'Test message',
        }),
      ).rejects.toThrow('Invalid phone number format');
    });
  });
});
