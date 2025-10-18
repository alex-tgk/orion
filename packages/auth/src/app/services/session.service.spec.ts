import { Test, TestingModule } from '@nestjs/testing';
import { SessionService, SessionData } from './session.service';
import { Logger } from '@nestjs/common';

// Mock Redis
const mockRedis: {
  setex: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  on: jest.Mock;
  _handlers: Record<string, (...args: unknown[]) => void>;
} = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
    // Store handlers for later triggering
    if (!mockRedis._handlers) {
      mockRedis._handlers = {};
    }
    mockRedis._handlers[event] = handler;
    return mockRedis;
  }),
  _handlers: {},
};

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedis),
    Redis: jest.fn().mockImplementation(() => mockRedis),
  };
});

describe('SessionService', () => {
  let service: SessionService;
  let mockLogger: jest.SpyInstance;

  const createMockSessionData = (overrides?: Partial<SessionData>): SessionData => ({
    userId: 'user-123',
    accessToken: 'access-token-xyz',
    refreshToken: 'refresh-token-abc',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    metadata: {
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    },
    ...overrides,
  });

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    mockRedis.setex.mockClear();
    mockRedis.get.mockClear();
    mockRedis.del.mockClear();
    mockRedis._handlers = {};

    // Mock Logger methods
    mockLogger = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);

    // Simulate Redis connection success
    if (mockRedis._handlers['connect']) {
      mockRedis._handlers['connect']();
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize Redis with correct configuration', () => {
      expect(mockRedis._handlers['connect']).toBeDefined();
      expect(mockRedis._handlers['error']).toBeDefined();
    });

    it('should log success message on Redis connection', () => {
      expect(mockLogger).toHaveBeenCalledWith('Redis connected successfully');
    });
  });

  describe('createSession', () => {
    it('should create a session in Redis with correct TTL', async () => {
      const sessionData = createMockSessionData();
      mockRedis.setex.mockResolvedValue('OK');

      await service.createSession(sessionData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `session:${sessionData.userId}`,
        7 * 24 * 60 * 60, // 7 days in seconds
        JSON.stringify(sessionData)
      );
      expect(mockLogger).toHaveBeenCalledWith(`Session created for user ${sessionData.userId}`);
    });

    it('should handle session creation with minimal metadata', async () => {
      const sessionData = createMockSessionData({ metadata: {} });
      mockRedis.setex.mockResolvedValue('OK');

      await service.createSession(sessionData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `session:${sessionData.userId}`,
        expect.any(Number),
        JSON.stringify(sessionData)
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const sessionData = createMockSessionData();
      const error = new Error('Redis connection failed');
      mockRedis.setex.mockRejectedValue(error);

      await service.createSession(sessionData);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to create session: ${error.message}`
      );
    });

    it('should warn when Redis is unavailable', async () => {
      // Simulate Redis error
      if (mockRedis._handlers['error']) {
        mockRedis._handlers['error'](new Error('Connection refused'));
      }

      const sessionData = createMockSessionData();
      await service.createSession(sessionData);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Redis unavailable, session not persisted'
      );
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('should retrieve a session from Redis', async () => {
      const sessionData = createMockSessionData();
      mockRedis.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await service.getSession(sessionData.userId);

      expect(mockRedis.get).toHaveBeenCalledWith(`session:${sessionData.userId}`);
      expect(result).toEqual(sessionData);
    });

    it('should return null when session does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSession('non-existent-user');

      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.getSession('user-123');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get session:')
      );
      expect(result).toBeNull();
    });

    it('should handle Redis errors', async () => {
      const error = new Error('Redis read failed');
      mockRedis.get.mockRejectedValue(error);

      const result = await service.getSession('user-123');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to get session: ${error.message}`
      );
      expect(result).toBeNull();
    });

    it('should return null when Redis is unavailable', async () => {
      if (mockRedis._handlers['error']) {
        mockRedis._handlers['error'](new Error('Connection refused'));
      }

      const result = await service.getSession('user-123');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Redis unavailable, cannot retrieve session'
      );
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session from Redis', async () => {
      const userId = 'user-123';
      mockRedis.del.mockResolvedValue(1);

      await service.deleteSession(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`session:${userId}`);
      expect(mockLogger).toHaveBeenCalledWith(`Session deleted for user ${userId}`);
    });

    it('should handle deletion of non-existent session', async () => {
      const userId = 'non-existent-user';
      mockRedis.del.mockResolvedValue(0); // Redis returns 0 when key doesn't exist

      await service.deleteSession(userId);

      expect(mockRedis.del).toHaveBeenCalledWith(`session:${userId}`);
    });

    it('should handle Redis errors during deletion', async () => {
      const error = new Error('Redis delete failed');
      mockRedis.del.mockRejectedValue(error);

      await service.deleteSession('user-123');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to delete session: ${error.message}`
      );
    });

    it('should warn when Redis is unavailable', async () => {
      if (mockRedis._handlers['error']) {
        mockRedis._handlers['error'](new Error('Connection refused'));
      }

      await service.deleteSession('user-123');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Redis unavailable, session not deleted'
      );
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token with correct expiration', async () => {
      const tokenId = 'token-xyz-123';
      const expiresIn = 900; // 15 minutes in seconds
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken(tokenId, expiresIn);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `blacklist:${tokenId}`,
        expiresIn,
        'revoked'
      );
      expect(mockLogger).toHaveBeenCalledWith(`Token ${tokenId} blacklisted`);
    });

    it('should handle blacklisting with different expiration times', async () => {
      const expirations = [60, 300, 900, 3600]; // 1min, 5min, 15min, 1hour

      for (const expiresIn of expirations) {
        mockRedis.setex.mockResolvedValue('OK');
        await service.blacklistToken('token-123', expiresIn);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'blacklist:token-123',
          expiresIn,
          'revoked'
        );
      }
    });

    it('should handle Redis errors during blacklisting', async () => {
      const error = new Error('Redis blacklist failed');
      mockRedis.setex.mockRejectedValue(error);

      await service.blacklistToken('token-123', 900);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to blacklist token: ${error.message}`
      );
    });

    it('should warn when Redis is unavailable', async () => {
      if (mockRedis._handlers['error']) {
        mockRedis._handlers['error'](new Error('Connection refused'));
      }

      await service.blacklistToken('token-123', 900);

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Redis unavailable, token not blacklisted'
      );
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      mockRedis.get.mockResolvedValue('revoked');

      const result = await service.isTokenBlacklisted('token-123');

      expect(mockRedis.get).toHaveBeenCalledWith('blacklist:token-123');
      expect(result).toBe(true);
    });

    it('should return false when token is not blacklisted', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('token-123');

      expect(result).toBe(false);
    });

    it('should handle Redis errors', async () => {
      const error = new Error('Redis check failed');
      mockRedis.get.mockRejectedValue(error);

      const result = await service.isTokenBlacklisted('token-123');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to check blacklist: ${error.message}`
      );
      expect(result).toBe(false);
    });

    it('should return false when Redis is unavailable', async () => {
      if (mockRedis._handlers['error']) {
        mockRedis._handlers['error'](new Error('Connection refused'));
      }

      const result = await service.isTokenBlacklisted('token-123');

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Redis unavailable, cannot check blacklist'
      );
      expect(result).toBe(false);
    });
  });

  describe('getRedisStatus', () => {
    it('should return "connected" when Redis is available', () => {
      const status = service.getRedisStatus();
      expect(status).toBe('connected');
    });

    it('should return "disconnected" when Redis is unavailable', () => {
      if (mockRedis._handlers['error']) {
        mockRedis._handlers['error'](new Error('Connection refused'));
      }

      const status = service.getRedisStatus();
      expect(status).toBe('disconnected');
    });
  });

  describe('graceful degradation', () => {
    it('should not throw errors when Redis operations fail', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis down'));
      mockRedis.get.mockRejectedValue(new Error('Redis down'));
      mockRedis.del.mockRejectedValue(new Error('Redis down'));

      const sessionData = createMockSessionData();

      await expect(service.createSession(sessionData)).resolves.not.toThrow();
      await expect(service.getSession('user-123')).resolves.not.toThrow();
      await expect(service.deleteSession('user-123')).resolves.not.toThrow();
      await expect(service.blacklistToken('token-123', 900)).resolves.not.toThrow();
      await expect(service.isTokenBlacklisted('token-123')).resolves.not.toThrow();
    });
  });
});
