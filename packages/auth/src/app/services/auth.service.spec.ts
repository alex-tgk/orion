import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { SessionService } from './session.service';
import { PrismaService } from '@orion/shared';
import { LoginDto, RefreshTokenDto } from '../dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    decode: jest.fn(),
  };

  const mockHashService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    deleteSession: jest.fn(),
    blacklistToken: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$12$hashedPassword',
    name: 'Test User',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: HashService, useValue: mockHashService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token-xyz')
        .mockReturnValueOnce('refresh-token-abc');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'rt-123',
        userId: mockUser.id,
        token: 'refresh-token-abc',
        expiresAt: new Date(),
        isRevoked: false,
        createdAt: new Date(),
      });
      mockSessionService.createSession.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(mockHashService.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(result).toEqual({
        accessToken: 'access-token-xyz',
        refreshToken: 'refresh-token-abc',
        expiresIn: 15 * 60,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(mockHashService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('User account is inactive');
      expect(mockHashService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHashService.compare.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should generate JWT tokens with correct payload', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      await service.login(loginDto);

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          jti: expect.any(String),
        }),
        {
          expiresIn: '15m',
          secret: expect.any(String),
        }
      );

      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: mockUser.id },
        {
          expiresIn: '7d',
          secret: expect.any(String),
        }
      );
    });

    it('should store refresh token in database', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token-abc');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      await service.login(loginDto);

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: 'refresh-token-abc',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should create session in Redis', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      await service.login(loginDto);

      expect(mockSessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        createdAt: expect.any(Number),
        expiresAt: expect.any(Number),
        metadata: {},
      });
    });
  });

  describe('logout', () => {
    const userId = 'user-123';
    const accessToken = 'valid-access-token';

    it('should successfully logout a user', async () => {
      mockJwtService.decode.mockReturnValue({
        jti: 'token-jti-123',
        exp: Math.floor(Date.now() / 1000) + 900,
      });
      mockSessionService.blacklistToken.mockResolvedValue(undefined);
      mockSessionService.deleteSession.mockResolvedValue(undefined);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId, accessToken);

      expect(mockJwtService.decode).toHaveBeenCalledWith(accessToken);
      expect(mockSessionService.blacklistToken).toHaveBeenCalledWith(
        'token-jti-123',
        expect.any(Number)
      );
      expect(mockSessionService.deleteSession).toHaveBeenCalledWith(userId);
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    });

    it('should handle logout when token has no JTI', async () => {
      mockJwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 });
      mockSessionService.deleteSession.mockResolvedValue(undefined);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId, accessToken);

      expect(mockSessionService.blacklistToken).not.toHaveBeenCalled();
      expect(mockSessionService.deleteSession).toHaveBeenCalled();
    });

    it('should handle logout when token decode fails', async () => {
      mockJwtService.decode.mockReturnValue(null);
      mockSessionService.deleteSession.mockResolvedValue(undefined);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId, accessToken);

      expect(mockSessionService.blacklistToken).not.toHaveBeenCalled();
      expect(mockSessionService.deleteSession).toHaveBeenCalled();
    });

    it('should propagate errors during logout', async () => {
      const error = new Error('Database error');
      mockJwtService.decode.mockReturnValue({ jti: 'jti-123', exp: 123456 });
      mockSessionService.blacklistToken.mockResolvedValue(undefined);
      mockSessionService.deleteSession.mockRejectedValue(error);

      await expect(service.logout(userId, accessToken)).rejects.toThrow('Database error');
    });
  });

  describe('refreshTokens', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    const storedToken = {
      id: 'rt-123',
      userId: 'user-123',
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      createdAt: new Date(),
      user: mockUser,
    };

    it('should successfully refresh tokens', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      const result = await service.refreshTokens(refreshTokenDto);

      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: refreshTokenDto.refreshToken },
        include: { user: true },
      });
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 15 * 60,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should throw UnauthorizedException when refresh token does not exist', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw UnauthorizedException when refresh token is revoked', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        isRevoked: true,
      });

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        'Refresh token has been revoked'
      );
    });

    it('should throw UnauthorizedException when refresh token is expired', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        'Refresh token has expired'
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        user: { ...mockUser, isActive: false },
      });

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        'User account is inactive'
      );
    });

    it('should revoke old refresh token (token rotation)', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      await service.refreshTokens(refreshTokenDto);

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });
    });

    it('should store new refresh token', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      await service.refreshTokens(refreshTokenDto);

      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          token: 'new-refresh-token',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should update session in Redis', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockPrismaService.refreshToken.update.mockResolvedValue({} as any);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      await service.refreshTokens(refreshTokenDto);

      expect(mockSessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        createdAt: expect.any(Number),
        expiresAt: expect.any(Number),
        metadata: {},
      });
    });
  });

  describe('validateUser', () => {
    it('should return user data when user exists and is active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          isActive: true,
        },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        createdAt: mockUser.createdAt,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('non-existent-id')).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateUser('non-existent-id')).rejects.toThrow(
        'User not found or inactive'
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.validateUser(mockUser.id)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(mockUser.id)).rejects.toThrow(
        'User not found or inactive'
      );
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent login attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockHashService.compare.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValue('access-token')
        .mockReturnValue('refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.refreshToken.create.mockResolvedValue({} as any);
      mockSessionService.createSession.mockResolvedValue(undefined);

      const loginDto: LoginDto = { email: 'test@example.com', password: 'password123' };
      const logins = Array.from({ length: 5 }, () => service.login(loginDto));

      const results = await Promise.all(logins);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
      });
    });

    it('should handle database errors during login', async () => {
      const loginDto: LoginDto = { email: 'test@example.com', password: 'password123' };
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.login(loginDto)).rejects.toThrow('DB connection lost');
    });
  });
});
