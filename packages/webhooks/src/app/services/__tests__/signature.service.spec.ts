import { Test, TestingModule } from '@nestjs/testing';
import { SignatureService } from '../signature.service';

describe('SignatureService', () => {
  let service: SignatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureService],
    }).compile();

    service = module.get<SignatureService>(SignatureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSignature', () => {
    it('should generate a valid HMAC-SHA256 signature', () => {
      const payload = { test: 'data', value: 123 };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate same signature for same payload and secret', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';

      const signature1 = service.generateSignature(payload, secret);
      const signature2 = service.generateSignature(payload, secret);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = { test: 'data1' };
      const payload2 = { test: 'data2' };
      const secret = 'test-secret';

      const signature1 = service.generateSignature(payload1, secret);
      const signature2 = service.generateSignature(payload2, secret);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const payload = { test: 'data' };
      const secret1 = 'secret1';
      const secret2 = 'secret2';

      const signature1 = service.generateSignature(payload, secret1);
      const signature2 = service.generateSignature(payload, secret2);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = { test: 'data', value: 123 };
      const secret = 'test-secret';
      const signature = service.generateSignature(payload, secret);

      const isValid = service.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';
      const invalidSignature = 'sha256=invalid';

      const isValid = service.verifySignature(payload, invalidSignature, secret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = { test: 'data' };
      const secret1 = 'secret1';
      const secret2 = 'secret2';
      const signature = service.generateSignature(payload, secret1);

      const isValid = service.verifySignature(payload, signature, secret2);

      expect(isValid).toBe(false);
    });

    it('should reject signature with modified payload', () => {
      const originalPayload = { test: 'data' };
      const modifiedPayload = { test: 'modified' };
      const secret = 'test-secret';
      const signature = service.generateSignature(originalPayload, secret);

      const isValid = service.verifySignature(modifiedPayload, signature, secret);

      expect(isValid).toBe(false);
    });

    it('should handle empty payloads', () => {
      const payload = {};
      const secret = 'test-secret';
      const signature = service.generateSignature(payload, secret);

      const isValid = service.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should handle complex nested payloads', () => {
      const payload = {
        user: { id: 1, name: 'Test', metadata: { key: 'value' } },
        items: [1, 2, 3],
        timestamp: '2025-10-18T12:00:00Z',
      };
      const secret = 'test-secret';
      const signature = service.generateSignature(payload, secret);

      const isValid = service.verifySignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });
  });

  describe('generateSecret', () => {
    it('should generate a random secret', () => {
      const secret = service.generateSecret();

      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different secrets each time', () => {
      const secret1 = service.generateSecret();
      const secret2 = service.generateSecret();

      expect(secret1).not.toBe(secret2);
    });

    it('should generate secret of specified length', () => {
      const secret = service.generateSecret(16);

      expect(secret).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
    });

    it('should generate 64 character secret by default', () => {
      const secret = service.generateSecret();

      expect(secret.length).toBe(64);
    });
  });

  describe('createWebhookPayload', () => {
    it('should create properly formatted webhook payload', () => {
      const eventId = 'evt_123';
      const eventType = 'user.created';
      const data = { userId: '456', email: 'test@example.com' };

      const payload = service.createWebhookPayload(eventId, eventType, data);

      expect(payload).toHaveProperty('id', eventId);
      expect(payload).toHaveProperty('event', eventType);
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('data', data);
    });

    it('should include valid ISO timestamp', () => {
      const payload = service.createWebhookPayload('evt_1', 'test.event', {});

      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
    });

    it('should handle empty data object', () => {
      const payload = service.createWebhookPayload('evt_1', 'test.event', {});

      expect(payload.data).toEqual({});
    });

    it('should handle complex data object', () => {
      const data = {
        user: { id: 1, name: 'Test' },
        items: [1, 2, 3],
        metadata: { key: 'value' },
      };

      const payload = service.createWebhookPayload('evt_1', 'test.event', data);

      expect(payload.data).toEqual(data);
    });
  });
});
