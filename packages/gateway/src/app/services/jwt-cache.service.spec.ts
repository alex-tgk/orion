import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtCacheService } from './jwt-cache.service';
import { RedisService } from './redis.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JwtCacheService', () => {
  let service: JwtCacheService;
  let redisService: RedisService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'gateway.JWT_CACHE_TTL': 300,
        'gateway.AUTH_SERVICE_URL': 'http://localhost:3001',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JwtCacheService>(JwtCacheService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validateToken', () => {
    const validToken = 'valid.jwt.token';
    const validatedData = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    it('should return cached token if available', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(JSON.stringify(validatedData));

      // Act
      const result = await service.validateToken(validToken);

      // Assert
      expect(result).toEqual(validatedData);
      expect(mockRedisService.get).toHaveBeenCalledWith(expect.stringContaining('jwt:'));
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should validate with auth service on cache miss', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: validatedData,
      });

      // Act
      const result = await service.validateToken(validToken);

      // Assert
      expect(result).toEqual(validatedData);
      expect(mockRedisService.get).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/validate',
        {},
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('jwt:'),
        JSON.stringify(validatedData),
        300
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(null);
      mockedAxios.post.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized',
      });

      // Act & Assert
      await expect(service.validateToken(validToken)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw error when auth service is unavailable', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(null);
      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      // Act & Assert
      await expect(service.validateToken(validToken)).rejects.toThrow(
        'Auth service unavailable'
      );
    });

    it('should throw UnauthorizedException for invalid response structure', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: { invalid: 'structure' },
      });

      // Act & Assert
      await expect(service.validateToken(validToken)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('invalidateToken', () => {
    it('should remove token from cache', async () => {
      // Arrange
      const token = 'some.jwt.token';
      mockRedisService.del.mockResolvedValue(undefined);

      // Act
      await service.invalidateToken(token);

      // Assert
      expect(mockRedisService.del).toHaveBeenCalledWith(
        expect.stringContaining('jwt:')
      );
    });
  });

  describe('token hashing', () => {
    it('should use hashed tokens as cache keys', async () => {
      // Arrange
      const token1 = 'token1';
      const token2 = 'token2';
      mockRedisService.get.mockResolvedValue(null);
      mockedAxios.post.mockResolvedValue({
        data: {
          userId: 'test',
          email: 'test@example.com',
          iat: Date.now(),
          exp: Date.now() + 3600,
        },
      });

      // Act
      await service.validateToken(token1);
      await service.validateToken(token2);

      // Assert
      const calls = mockRedisService.get.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]); // Different hashes for different tokens
      expect(calls[0][0]).toContain('jwt:');
      expect(calls[1][0]).toContain('jwt:');
    });
  });
});
