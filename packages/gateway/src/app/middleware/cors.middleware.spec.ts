import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CorsMiddleware } from './cors.middleware';
import { Request, Response } from 'express';

describe('CorsMiddleware', () => {
  let middleware: CorsMiddleware;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'gateway.CORS_ORIGIN': 'http://localhost:4200',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorsMiddleware,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    middleware = module.get<CorsMiddleware>(CorsMiddleware);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('CORS headers', () => {
    it('should set all required CORS headers', () => {
      // Arrange
      const mockRequest: Partial<Request> = {
        method: 'GET',
      };
      const mockResponse: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:4200'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Expose-Headers',
        'X-Correlation-ID'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Max-Age',
        '3600'
      );
    });

    it('should call next() for non-OPTIONS requests', () => {
      // Arrange
      const mockRequest: Partial<Request> = {
        method: 'GET',
      };
      const mockResponse: Partial<Response> = {
        setHeader: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('preflight requests', () => {
    it('should handle OPTIONS preflight requests', () => {
      // Arrange
      const mockRequest: Partial<Request> = {
        method: 'OPTIONS',
      };
      const mockResponse: Partial<Response> = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };
      const nextFunction = jest.fn();

      // Act
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should use configured origin', () => {
      // Arrange
      mockConfigService.get.mockReturnValueOnce('https://example.com');

      const module = Test.createTestingModule({
        providers: [
          CorsMiddleware,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      // Create fresh instance
      module.then((m) => {
        const freshMiddleware = m.get<CorsMiddleware>(CorsMiddleware);

        const mockRequest: Partial<Request> = {
          method: 'GET',
        };
        const mockResponse: Partial<Response> = {
          setHeader: jest.fn(),
        };
        const nextFunction = jest.fn();

        // Act
        freshMiddleware.use(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        // Assert
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Access-Control-Allow-Origin',
          'https://example.com'
        );
      });
    });
  });
});
