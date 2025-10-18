import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '@orion/shared';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('validate', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
      expect(strategy.validate).toBeDefined();
    });

    it('should validate and return user when payload is valid and user is active', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-user',
        email: 'nonexistent@example.com',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found or inactive'
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'inactive@example.com',
      };

      const mockInactiveUser = {
        id: 'user-123',
        email: 'inactive@example.com',
        name: 'Inactive User',
        isActive: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockInactiveUser);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User not found or inactive'
      );
    });

    it('should handle user with missing optional fields', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
    });

    it('should validate multiple users sequentially', async () => {
      const users = [
        {
          payload: { sub: 'user-1', email: 'user1@example.com' },
          user: { id: 'user-1', email: 'user1@example.com', name: 'User 1', isActive: true },
        },
        {
          payload: { sub: 'user-2', email: 'user2@example.com' },
          user: { id: 'user-2', email: 'user2@example.com', name: 'User 2', isActive: true },
        },
        {
          payload: { sub: 'user-3', email: 'user3@example.com' },
          user: { id: 'user-3', email: 'user3@example.com', name: 'User 3', isActive: true },
        },
      ];

      for (const { payload, user } of users) {
        mockPrismaService.user.findUnique.mockResolvedValue(user);
        const result = await strategy.validate(payload);
        expect(result).toEqual(user);
      }

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(3);
    });

    it('should handle database errors gracefully', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const dbError = new Error('Database connection failed');
      mockPrismaService.user.findUnique.mockRejectedValue(dbError);

      await expect(strategy.validate(payload)).rejects.toThrow('Database connection failed');
    });

    it('should only select specified fields from database', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await strategy.validate(payload);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });
    });

    it('should handle special characters in email', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test+tag@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test+tag@example.com',
        name: 'Test User',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
    });

    it('should validate user with UUID format user ID', async () => {
      const payload: JwtPayload = {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      };

      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result.id).toBe(payload.sub);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid successive validations', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const validations = Array.from({ length: 100 }, () => strategy.validate(payload));
      const results = await Promise.all(validations);

      results.forEach((result: unknown) => {
        expect(result).toEqual(mockUser);
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(100);
    });

    it('should handle user status changing between validations', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      // First validation - user is active
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
      });

      const result1 = await strategy.validate(payload);
      expect(result1.isActive).toBe(true);

      // Second validation - user is now inactive
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: false,
      });

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
