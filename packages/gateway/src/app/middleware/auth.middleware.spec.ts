import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';
import { JwtCacheService } from '../services/jwt-cache.service';
import { ProxyService } from '../services/proxy.service';
import { Response } from 'express';
import { RequestContext } from '../interfaces/request-context.interface';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;

  const mockJwtCacheService = {
    validateToken: jest.fn(),
  };

  const mockProxyService = {
    getRouteConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthMiddleware,
        {
          provide: JwtCacheService,
          useValue: mockJwtCacheService,
        },
        {
          provide: ProxyService,
          useValue: mockProxyService,
        },
      ],
    }).compile();

    middleware = module.get<AuthMiddleware>(AuthMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });
  });

  describe('public routes', () => {
    it('should allow requests to routes that do not require auth', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/auth/login',
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      mockProxyService.getRouteConfig.mockReturnValue({
        authRequired: false,
        target: 'http://localhost:3001',
      });

      // Act
      await middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockJwtCacheService.validateToken).not.toHaveBeenCalled();
    });

    it('should allow requests when route config is null', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/unknown',
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      mockProxyService.getRouteConfig.mockReturnValue(null);

      // Act
      await middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalled();
      expect(mockJwtCacheService.validateToken).not.toHaveBeenCalled();
    });
  });

  describe('protected routes', () => {
    const validToken = 'valid.jwt.token';
    const validatedUser = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    beforeEach(() => {
      mockProxyService.getRouteConfig.mockReturnValue({
        authRequired: true,
        target: 'http://localhost:3002',
      });
    });

    it('should allow authenticated requests with valid token', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/users/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      mockJwtCacheService.validateToken.mockResolvedValue(validatedUser);

      // Act
      await middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockJwtCacheService.validateToken).toHaveBeenCalledWith(validToken);
      expect(mockRequest.user).toEqual(validatedUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject requests without Authorization header', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/users/me',
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act & Assert
      await expect(
        middleware.use(
          mockRequest as RequestContext,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject requests with malformed Authorization header', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/users/me',
        headers: {
          authorization: 'InvalidFormat',
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act & Assert
      await expect(
        middleware.use(
          mockRequest as RequestContext,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid token', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/users/me',
        headers: {
          authorization: `Bearer invalid.token`,
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      mockJwtCacheService.validateToken.mockRejectedValue(
        new UnauthorizedException('Invalid token')
      );

      // Act & Assert
      await expect(
        middleware.use(
          mockRequest as RequestContext,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 503 when auth service is unavailable', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/users/me',
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      mockJwtCacheService.validateToken.mockRejectedValue(
        new Error('Auth service unavailable')
      );

      // Act & Assert
      await expect(
        middleware.use(
          mockRequest as RequestContext,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow(HttpException);

      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockProxyService.getRouteConfig.mockReturnValue({
        authRequired: true,
        target: 'http://localhost:3002',
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        path: '/api/v1/users/me',
        headers: {
          authorization: 'Bearer token',
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      mockJwtCacheService.validateToken.mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act & Assert
      await expect(
        middleware.use(
          mockRequest as RequestContext,
          mockResponse as Response,
          nextFunction
        )
      ).rejects.toThrow();

      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
