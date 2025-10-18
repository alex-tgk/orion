import { Test, TestingModule } from '@nestjs/testing';
import { RequestTransformMiddleware } from './request-transform.middleware';
import { Response } from 'express';
import { RequestContext } from '../interfaces/request-context.interface';

describe('RequestTransformMiddleware', () => {
  let middleware: RequestTransformMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestTransformMiddleware],
    }).compile();

    middleware = module.get<RequestTransformMiddleware>(RequestTransformMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('correlation ID handling', () => {
    it('should add correlation ID to headers if present', () => {
      // Arrange
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const mockRequest: Partial<RequestContext> = {
        correlationId,
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!['x-correlation-id']).toBe(correlationId);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not add correlation ID header if not present', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!['x-correlation-id']).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('user context headers', () => {
    it('should add user context headers for authenticated requests', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        user: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
        },
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!['x-user-id']).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockRequest.headers!['x-user-email']).toBe('user@example.com');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not add user headers for unauthenticated requests', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!['x-user-id']).toBeUndefined();
      expect(mockRequest.headers!['x-user-email']).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('internal service marker', () => {
    it('should add gateway forwarded header', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        headers: {},
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!['x-gateway-forwarded']).toBe('true');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('sensitive headers removal', () => {
    it('should remove sensitive headers before forwarding', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        headers: {
          cookie: 'session=abc123',
          'set-cookie': ['test=value'],
          'x-real-ip': '192.168.1.1',
          'x-forwarded-for': '10.0.0.1',
          'content-type': 'application/json',
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!.cookie).toBeUndefined();
      expect(mockRequest.headers!['set-cookie']).toBeUndefined();
      expect(mockRequest.headers!['x-real-ip']).toBeUndefined();
      expect(mockRequest.headers!['x-forwarded-for']).toBeUndefined();
      expect(mockRequest.headers!['content-type']).toBe('application/json'); // Should not be removed
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should apply all transformations together', () => {
      // Arrange
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const mockRequest: Partial<RequestContext> = {
        correlationId,
        user: {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
        },
        headers: {
          cookie: 'session=abc123',
          'content-type': 'application/json',
        },
      };
      const mockResponse: Partial<Response> = {};
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockRequest.headers!['x-correlation-id']).toBe(correlationId);
      expect(mockRequest.headers!['x-user-id']).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockRequest.headers!['x-user-email']).toBe('user@example.com');
      expect(mockRequest.headers!['x-gateway-forwarded']).toBe('true');
      expect(mockRequest.headers!.cookie).toBeUndefined();
      expect(mockRequest.headers!['content-type']).toBe('application/json');
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
