import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { LoginDto, RefreshTokenDto, LoginResponseDto, UserResponseDto } from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let sessionService: jest.Mocked<SessionService>;

  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    validateUser: jest.fn(),
  };

  const mockSessionService = {
    getRedisStatus: jest.fn(),
  };

  const mockLoginResponse: LoginResponseDto = {
    accessToken: 'access-token-xyz',
    refreshToken: 'refresh-token-abc',
    expiresIn: 900,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date('2024-01-01'),
    },
  };

  const mockUserResponse: UserResponseDto = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    sessionService = module.get(SessionService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.login).toBeDefined();
    });

    it('should successfully login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle different email formats', async () => {
      const emails = [
        'user@example.com',
        'user+tag@example.com',
        'user.name@example.com',
        'user@subdomain.example.com',
      ];

      for (const email of emails) {
        const loginDto: LoginDto = { email, password: 'password123' };
        mockAuthService.login.mockResolvedValue(mockLoginResponse);

        await controller.login(loginDto);

        expect(authService.login).toHaveBeenCalledWith(loginDto);
      }
    });

    it('should propagate errors from auth service', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should handle empty password', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: '',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('logout', () => {
    it('should be defined', () => {
      expect(controller.logout).toBeDefined();
    });

    it('should successfully logout a user', async () => {
      const req = { user: { id: 'user-123' } };
      const authHeader = 'Bearer access-token-xyz';

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req as any, authHeader);

      expect(authService.logout).toHaveBeenCalledWith('user-123', 'access-token-xyz');
      expect(authService.logout).toHaveBeenCalledTimes(1);
    });

    it('should extract token from authorization header', async () => {
      const req = { user: { id: 'user-123' } };
      const authHeader = 'Bearer my-access-token';

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req as any, authHeader);

      expect(authService.logout).toHaveBeenCalledWith('user-123', 'my-access-token');
    });

    it('should handle authorization header without Bearer prefix', async () => {
      const req = { user: { id: 'user-123' } };
      const authHeader = 'access-token-xyz';

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req as any, authHeader);

      expect(authService.logout).toHaveBeenCalledWith('user-123', 'access-token-xyz');
    });

    it('should handle missing authorization header', async () => {
      const req = { user: { id: 'user-123' } };
      const authHeader = undefined;

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req as any, authHeader as any);

      expect(authService.logout).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should propagate errors from auth service', async () => {
      const req = { user: { id: 'user-123' } };
      const authHeader = 'Bearer access-token';
      const error = new Error('Logout failed');

      mockAuthService.logout.mockRejectedValue(error);

      await expect(controller.logout(req as any, authHeader)).rejects.toThrow('Logout failed');
    });
  });

  describe('refresh', () => {
    it('should be defined', () => {
      expect(controller.refresh).toBeDefined();
    });

    it('should successfully refresh tokens', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(mockLoginResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto);
      expect(authService.refreshTokens).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle different refresh token formats', async () => {
      const tokens = [
        'short-token',
        'very-long-token-with-many-characters',
        'token.with.dots',
        'token_with_underscores',
      ];

      for (const token of tokens) {
        const refreshTokenDto: RefreshTokenDto = { refreshToken: token };
        mockAuthService.refreshTokens.mockResolvedValue(mockLoginResponse);

        await controller.refresh(refreshTokenDto);

        expect(authService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto);
      }
    });

    it('should propagate errors from auth service', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-token',
      };

      const error = new Error('Invalid refresh token');
      mockAuthService.refreshTokens.mockRejectedValue(error);

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('getProfile', () => {
    it('should be defined', () => {
      expect(controller.getProfile).toBeDefined();
    });

    it('should return user profile', async () => {
      const req = { user: { id: 'user-123' } };

      mockAuthService.validateUser.mockResolvedValue(mockUserResponse);

      const result = await controller.getProfile(req as any);

      expect(authService.validateUser).toHaveBeenCalledWith('user-123');
      expect(authService.validateUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUserResponse);
    });

    it('should handle different user IDs', async () => {
      const userIds = [
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        'abc-def-ghi',
      ];

      for (const userId of userIds) {
        const req = { user: { id: userId } };
        mockAuthService.validateUser.mockResolvedValue({ ...mockUserResponse, id: userId });

        const result = await controller.getProfile(req as any);

        expect(authService.validateUser).toHaveBeenCalledWith(userId);
        expect(result.id).toBe(userId);
      }
    });

    it('should propagate errors from auth service', async () => {
      const req = { user: { id: 'user-123' } };
      const error = new Error('User not found');

      mockAuthService.validateUser.mockRejectedValue(error);

      await expect(controller.getProfile(req as any)).rejects.toThrow('User not found');
    });
  });

  describe('getHealth', () => {
    it('should be defined', () => {
      expect(controller.getHealth).toBeDefined();
    });

    it('should return "ok" status when Redis is connected', () => {
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = controller.getHealth();

      expect(sessionService.getRedisStatus).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        redis: 'connected',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should return "degraded" status when Redis is disconnected', () => {
      mockSessionService.getRedisStatus.mockReturnValue('disconnected');

      const result = controller.getHealth();

      expect(result).toEqual({
        status: 'degraded',
        redis: 'disconnected',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should include uptime in health response', () => {
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = controller.getHealth();

      expect(result.uptime).toBeGreaterThan(0);
      expect(typeof result.uptime).toBe('number');
    });

    it('should include valid ISO timestamp', () => {
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const result = controller.getHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should handle rapid successive health checks', () => {
      mockSessionService.getRedisStatus.mockReturnValue('connected');

      const results = Array.from({ length: 100 }, () => controller.getHealth());

      results.forEach((result) => {
        expect(result.status).toBe('ok');
        expect(result.redis).toBe('connected');
      });

      expect(sessionService.getRedisStatus).toHaveBeenCalledTimes(100);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete auth flow', async () => {
      // Login
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const loginResult = await controller.login(loginDto);
      expect(loginResult.accessToken).toBeDefined();

      // Get profile
      const req = { user: { id: mockLoginResponse.user.id } };
      mockAuthService.validateUser.mockResolvedValue(mockUserResponse);

      const profileResult = await controller.getProfile(req as any);
      expect(profileResult.id).toBe(mockLoginResponse.user.id);

      // Logout
      const authHeader = `Bearer ${loginResult.accessToken}`;
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req as any, authHeader);
      expect(authService.logout).toHaveBeenCalledWith(
        mockLoginResponse.user.id,
        loginResult.accessToken
      );
    });

    it('should handle token refresh flow', async () => {
      // Initial login
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const loginResult = await controller.login(loginDto);

      // Refresh tokens
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: loginResult.refreshToken,
      };
      const newTokens = {
        ...mockLoginResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAuthService.refreshTokens.mockResolvedValue(newTokens);

      const refreshResult = await controller.refresh(refreshTokenDto);
      expect(refreshResult.accessToken).toBe('new-access-token');
      expect(refreshResult.refreshToken).toBe('new-refresh-token');
    });
  });
});
