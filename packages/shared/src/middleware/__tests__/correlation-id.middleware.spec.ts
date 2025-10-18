import { Request, Response, NextFunction } from 'express';
import {
  CorrelationIdMiddleware,
  correlationIdMiddleware,
  CORRELATION_ID_HEADER,
} from '../correlation-id.middleware';
import { LoggerService } from '@orion/logger';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();

    setHeaderSpy = jest.fn();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: setHeaderSpy,
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Class-based Middleware', () => {
    it('should generate correlation ID when not present', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();

      const correlationId = setHeaderSpy.mock.calls[0][1];
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      expect(correlationId.length).toBeGreaterThan(0);
    });

    it('should use existing correlation ID from header', () => {
      const existingId = 'existing-correlation-id-123';
      mockRequest.headers = {
        [CORRELATION_ID_HEADER]: existingId,
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(CORRELATION_ID_HEADER, existingId);
      expect((mockRequest as any).correlationId).toBe(existingId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle lowercase header name', () => {
      const existingId = 'lowercase-correlation-id-456';
      mockRequest.headers = {
        [CORRELATION_ID_HEADER.toLowerCase()]: existingId,
      };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(CORRELATION_ID_HEADER, existingId);
      expect((mockRequest as any).correlationId).toBe(existingId);
    });

    it('should attach correlation ID to request object', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).correlationId).toBeDefined();
      expect(typeof (mockRequest as any).correlationId).toBe('string');
    });

    it('should set correlation ID in response header', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        expect.any(String)
      );
    });

    it('should call next middleware', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate unique IDs for different requests', () => {
      const correlationIds = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const req = { headers: {} } as Request;
        const res = { setHeader: jest.fn() } as unknown as Response;
        const next = jest.fn();

        middleware.use(req, res, next);

        const id = (res.setHeader as jest.Mock).mock.calls[0][1] as string;
        correlationIds.add(id);
      }

      expect(correlationIds.size).toBe(10); // All IDs should be unique
    });
  });

  describe('Functional Middleware', () => {
    it('should generate correlation ID when not present', () => {
      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();

      const correlationId = setHeaderSpy.mock.calls[0][1];
      expect(correlationId).toBeDefined();
    });

    it('should use existing correlation ID from header', () => {
      const existingId = 'functional-correlation-id-789';
      mockRequest.headers = {
        [CORRELATION_ID_HEADER]: existingId,
      };

      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(CORRELATION_ID_HEADER, existingId);
      expect((mockRequest as any).correlationId).toBe(existingId);
    });

    it('should attach correlation ID to request object', () => {
      correlationIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).correlationId).toBeDefined();
    });
  });

  describe('AsyncLocalStorage Integration', () => {
    it('should set correlation ID in AsyncLocalStorage', () => {
      const runWithCorrelationIdSpy = jest.spyOn(LoggerService, 'runWithCorrelationId');

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(runWithCorrelationIdSpy).toHaveBeenCalled();

      const correlationId = runWithCorrelationIdSpy.mock.calls[0][0];
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');

      runWithCorrelationIdSpy.mockRestore();
    });

    it('should propagate correlation ID through async context', (done) => {
      const existingId = 'async-propagation-test';
      mockRequest.headers = {
        [CORRELATION_ID_HEADER]: existingId,
      };

      const runWithCorrelationIdSpy = jest
        .spyOn(LoggerService, 'runWithCorrelationId')
        .mockImplementation((id, fn) => {
          expect(id).toBe(existingId);
          const result = fn();
          done();
          return result;
        });

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      runWithCorrelationIdSpy.mockRestore();
    });
  });

  describe('Header Case Sensitivity', () => {
    it('should handle mixed-case header names', () => {
      const testCases = [
        { header: 'X-Correlation-Id', id: 'mixed-case-1' },
        { header: 'x-correlation-id', id: 'lowercase-2' },
        { header: 'X-CORRELATION-ID', id: 'uppercase-3' },
      ];

      testCases.forEach(({ header, id }) => {
        const req = { headers: { [header]: id } } as Request;
        const res = { setHeader: jest.fn() } as unknown as Response;
        const next = jest.fn();

        middleware.use(req, res, next);

        expect((res.setHeader as jest.Mock)).toHaveBeenCalledWith(
          CORRELATION_ID_HEADER,
          id
        );
      });
    });
  });

  describe('UUID Generation', () => {
    it('should generate valid UUID v4 format', () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      const generatedId = setHeaderSpy.mock.calls[0][1] as string;
      expect(generatedId).toMatch(uuidRegex);
    });
  });

  describe('Request Object Augmentation', () => {
    it('should augment request with correlationId property', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).correlationId).toBeDefined();
      expect(typeof (mockRequest as any).correlationId).toBe('string');
    });

    it('should match correlation ID in header and request object', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      const headerCorrelationId = setHeaderSpy.mock.calls[0][1];
      const requestCorrelationId = (mockRequest as any).correlationId;

      expect(headerCorrelationId).toBe(requestCorrelationId);
    });
  });

  describe('Idempotency', () => {
    it('should preserve existing correlation ID through multiple middleware calls', () => {
      const existingId = 'idempotent-test-id';
      mockRequest.headers = {
        [CORRELATION_ID_HEADER]: existingId,
      };

      // First call
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      const firstCallId = setHeaderSpy.mock.calls[0][1];

      // Update request with the same ID
      mockRequest.headers = {
        [CORRELATION_ID_HEADER]: firstCallId,
      };

      setHeaderSpy.mockClear();
      mockNext.mockClear();

      // Second call
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      const secondCallId = setHeaderSpy.mock.calls[0][1];

      expect(firstCallId).toBe(secondCallId);
      expect(firstCallId).toBe(existingId);
    });
  });
});
