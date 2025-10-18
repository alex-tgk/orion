import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus, NotFoundException, BadRequestException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {},
      ip: '127.0.0.1',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  describe('HTTP Exception Handling', () => {
    it('should handle NotFoundException correctly', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
          path: '/api/test',
          method: 'GET',
        }),
      );
    });

    it('should handle BadRequestException correctly', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid input',
        }),
      );
    });

    it('should handle validation errors with array messages', () => {
      const exception = new BadRequestException(['Field1 is required', 'Field2 is invalid']);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ['Field1 is required', 'Field2 is invalid'],
        }),
      );
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle generic Error instances', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
        }),
      );
    });

    it('should handle unknown error types', () => {
      const exception = { weird: 'error' };

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred',
          error: 'Unknown Error',
        }),
      );
    });
  });

  describe('Correlation ID', () => {
    it('should use correlation ID from request headers if present', () => {
      mockRequest.headers['x-correlation-id'] = 'existing-correlation-id';
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-Id', 'existing-correlation-id');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'existing-correlation-id',
        }),
      );
    });

    it('should generate correlation ID if not present', () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-Id', expect.stringMatching(/^admin-ui-/));
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: expect.stringMatching(/^admin-ui-/),
        }),
      );
    });
  });

  describe('Response Structure', () => {
    it('should include timestamp in ISO format', () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      );
    });

    it('should include request path and method', () => {
      mockRequest.url = '/api/services/auth';
      mockRequest.method = 'POST';
      const exception = new BadRequestException();

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/services/auth',
          method: 'POST',
        }),
      );
    });
  });
});
