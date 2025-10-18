import { Test, TestingModule } from '@nestjs/testing';
import { ResponseTransformMiddleware } from './response-transform.middleware';
import { Response } from 'express';
import { RequestContext } from '../interfaces/request-context.interface';

describe('ResponseTransformMiddleware', () => {
  let middleware: ResponseTransformMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseTransformMiddleware],
    }).compile();

    middleware = module.get<ResponseTransformMiddleware>(ResponseTransformMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('response send override', () => {
    it('should override response send method', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
      };
      const originalSend = jest.fn();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.send).not.toBe(originalSend);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('correlation ID in response', () => {
    it('should add correlation ID to response headers', () => {
      // Arrange
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const mockRequest: Partial<RequestContext> = {
        correlationId,
      };
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      (mockResponse.send as any)({ data: 'test' });

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        correlationId
      );
    });

    it('should not add correlation ID if not present', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {};
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      (mockResponse.send as any)({ data: 'test' });

      // Assert
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'X-Correlation-ID',
        expect.anything()
      );
    });
  });

  describe('security headers', () => {
    beforeEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should add security headers in development', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const mockRequest: Partial<RequestContext> = {};
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      (mockResponse.send as any)({ data: 'test' });

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
    });

    it('should add HSTS header in production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const mockRequest: Partial<RequestContext> = {};
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      (mockResponse.send as any)({ data: 'test' });

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    });
  });

  describe('internal headers removal', () => {
    it('should remove internal headers from response', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {};
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      (mockResponse.send as any)({ data: 'test' });

      // Assert
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('x-gateway-forwarded');
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('x-service-name');
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('x-service-version');
    });
  });

  describe('response body handling', () => {
    it('should call original send with body', () => {
      // Arrange
      const mockRequest: Partial<RequestContext> = {};
      const responseBody = { data: 'test', status: 'ok' };
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      const result = (mockResponse.send as any)(responseBody);

      // Assert
      expect(originalSend).toHaveBeenCalledWith(responseBody);
      expect(result).toBe(mockResponse);
    });
  });

  describe('integration', () => {
    it('should apply all transformations together', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      const mockRequest: Partial<RequestContext> = {
        correlationId,
      };
      const responseBody = { data: 'test' };
      const originalSend = jest.fn().mockReturnThis();
      const mockResponse: Partial<Response> = {
        send: originalSend,
        setHeader: jest.fn(),
        removeHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as RequestContext,
        mockResponse as Response,
        nextFunction
      );

      // Call the overridden send method
      (mockResponse.send as any)(responseBody);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', correlationId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('x-gateway-forwarded');
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('x-service-name');
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('x-service-version');
      expect(originalSend).toHaveBeenCalledWith(responseBody);
    });
  });
});
