import { LoggingMiddleware } from './logging.middleware';
import { Response } from 'express';
import { RequestContext } from '../interfaces/request-context.interface';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let mockRequest: Partial<RequestContext>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new LoggingMiddleware();
    
    mockRequest = {
      method: 'GET',
      path: '/api/v1/users',
      ip: '127.0.0.1',
      headers: {},
    };

    mockResponse = {
      on: jest.fn(),
      setHeader: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should add correlation ID to request', () => {
    middleware.use(mockRequest as RequestContext, mockResponse as Response, nextFunction);

    expect(mockRequest.correlationId).toBeDefined();
    expect(typeof mockRequest.correlationId).toBe('string');
  });

  it('should add correlation ID to response headers', () => {
    middleware.use(mockRequest as RequestContext, mockResponse as Response, nextFunction);

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Correlation-ID',
      expect.any(String)
    );
  });

  it('should call next function', () => {
    middleware.use(mockRequest as RequestContext, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set start time on request', () => {
    middleware.use(mockRequest as RequestContext, mockResponse as Response, nextFunction);

    expect(mockRequest.startTime).toBeDefined();
    expect(typeof mockRequest.startTime).toBe('number');
  });
});
