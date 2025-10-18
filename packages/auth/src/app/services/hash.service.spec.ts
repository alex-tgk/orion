import { Test, TestingModule } from '@nestjs/testing';
import { HashService } from './hash.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt to avoid slow actual hashing in tests
jest.mock('bcrypt');

describe('HashService', () => {
  let service: HashService;
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hash', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service.hash).toBeDefined();
    });

    it('should hash a password using bcrypt with 12 salt rounds', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$12$hashedPasswordExample';

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hash(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
      expect(result).toBe(hashedPassword);
    });

    it('should handle different password inputs', async () => {
      const passwords = [
        'short',
        'a very long password with many characters and symbols !@#$%^&*()',
        'パスワード', // Unicode characters
        '12345678',
        'Password123!@#',
      ];

      for (const password of passwords) {
        const hash = `$2b$12$hash_for_${password.length}`;
        mockedBcrypt.hash.mockResolvedValue(hash as never);

        const result = await service.hash(password);

        expect(result).toBe(hash);
      }
    });

    it('should propagate bcrypt errors', async () => {
      const password = 'testPassword';
      const error = new Error('Bcrypt hashing failed');

      mockedBcrypt.hash.mockRejectedValue(error as never);

      await expect(service.hash(password)).rejects.toThrow('Bcrypt hashing failed');
    });
  });

  describe('compare', () => {
    it('should be defined', () => {
      expect(service.compare).toBeDefined();
    });

    it('should return true when password matches hash', async () => {
      const password = 'testPassword123';
      const hash = '$2b$12$hashedPasswordExample';

      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.compare(password, hash);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should return false when password does not match hash', async () => {
      const password = 'wrongPassword';
      const hash = '$2b$12$hashedPasswordExample';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.compare(password, hash);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = '$2b$12$hashedPasswordExample';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.compare(password, hash);

      expect(result).toBe(false);
    });

    it('should handle case sensitivity correctly', async () => {
      const password = 'TestPassword';
      const hash = '$2b$12$hashedPasswordExample';

      // First call - correct case
      mockedBcrypt.compare.mockResolvedValue(true as never);
      const resultCorrect = await service.compare(password, hash);
      expect(resultCorrect).toBe(true);

      // Second call - wrong case
      mockedBcrypt.compare.mockResolvedValue(false as never);
      const resultWrong = await service.compare('testpassword', hash);
      expect(resultWrong).toBe(false);
    });

    it('should propagate bcrypt errors', async () => {
      const password = 'testPassword';
      const hash = '$2b$12$hashedPasswordExample';
      const error = new Error('Bcrypt compare failed');

      mockedBcrypt.compare.mockRejectedValue(error as never);

      await expect(service.compare(password, hash)).rejects.toThrow(
        'Bcrypt compare failed'
      );
    });

    it('should handle invalid hash format gracefully', async () => {
      const password = 'testPassword';
      const invalidHash = 'not-a-valid-hash';
      const error = new Error('Invalid hash format');

      mockedBcrypt.compare.mockRejectedValue(error as never);

      await expect(service.compare(password, invalidHash)).rejects.toThrow(
        'Invalid hash format'
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid successive hashing requests', async () => {
      const passwords = Array.from({ length: 10 }, (_, i) => `password${i}`);
      const hashes = passwords.map((_, i) => `$2b$12$hash${i}`);

      passwords.forEach((_, i) => {
        mockedBcrypt.hash.mockResolvedValueOnce(hashes[i] as never);
      });

      const results = await Promise.all(passwords.map((pwd) => service.hash(pwd)));

      expect(results).toEqual(hashes);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid successive comparison requests', async () => {
      const comparisons = Array.from({ length: 10 }, (_, i) => ({
        password: `password${i}`,
        hash: `$2b$12$hash${i}`,
        expected: i % 2 === 0,
      }));

      comparisons.forEach((comp) => {
        mockedBcrypt.compare.mockResolvedValueOnce(comp.expected as never);
      });

      const results = await Promise.all(
        comparisons.map((comp) => service.compare(comp.password, comp.hash))
      );

      expect(results).toEqual(comparisons.map((c) => c.expected));
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(10);
    });
  });
});
