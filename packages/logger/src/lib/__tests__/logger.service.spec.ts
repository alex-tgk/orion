import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../logger.service';
import * as winston from 'winston';
import { createLoggerConfig } from '../logger.config';

describe('LoggerService', () => {
  let service: LoggerService;
  let winstonLogger: winston.Logger;
  let mockLogFn: jest.Mock;

  beforeEach(() => {
    mockLogFn = jest.fn();

    // Create a mock Winston logger
    winstonLogger = winston.createLogger({
      level: 'debug',
      transports: [
        new winston.transports.Stream({
          stream: {
            write: mockLogFn,
          } as any,
        }),
      ],
    });

    service = new LoggerService(winstonLogger, 'TestContext');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set initial context', () => {
      const contextService = new LoggerService(winstonLogger, 'MyContext');
      contextService.log('Test message');

      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('MyContext');
    });
  });

  describe('Context Management', () => {
    it('should update context using setContext', () => {
      service.setContext('NewContext');
      service.log('Test message');

      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('NewContext');
    });

    it('should allow context override in log methods', () => {
      service.log('Test message', 'OverriddenContext');

      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('OverriddenContext');
    });
  });

  describe('Logging Methods', () => {
    it('should log info messages', () => {
      service.log('Info message', undefined, { userId: '123' });

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('Info message');
      expect(logCall).toContain('userId');
    });

    it('should log error messages with stack trace', () => {
      const error = new Error('Test error');
      service.error('Error message', error.stack, undefined, { errorCode: 'ERR001' });

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('Error message');
      expect(logCall).toContain('errorCode');
    });

    it('should log warning messages', () => {
      service.warn('Warning message', undefined, { warningType: 'DEPRECATED' });

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('Warning message');
    });

    it('should log debug messages', () => {
      service.debug('Debug message', undefined, { debugData: 'test' });

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('Debug message');
    });

    it('should log verbose messages', () => {
      service.verbose('Verbose message', undefined, { verboseData: 'test' });

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('Verbose message');
    });

    it('should log HTTP messages', () => {
      service.http('GET /api/users', { statusCode: 200, duration: 45 });

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('GET /api/users');
    });
  });

  describe('Correlation ID Support', () => {
    it('should include correlation ID from AsyncLocalStorage', () => {
      const correlationId = 'test-correlation-id-123';

      LoggerService.runWithCorrelationId(correlationId, () => {
        service.log('Test message');

        const logCall = mockLogFn.mock.calls[0][0];
        expect(logCall).toContain(correlationId);
      });
    });

    it('should set correlation ID using static method', () => {
      const correlationId = 'static-correlation-id';

      LoggerService.runWithCorrelationId(correlationId, () => {
        service.log('Test message');

        const logCall = mockLogFn.mock.calls[0][0];
        expect(logCall).toContain(correlationId);
      });
    });

    it('should work without correlation ID', () => {
      service.log('Test message');

      expect(mockLogFn).toHaveBeenCalled();
      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('Test message');
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with new context', () => {
      const childLogger = service.child('ChildContext', { parentId: '123' });

      childLogger.log('Child log message');

      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('ChildContext');
      expect(logCall).toContain('parentId');
    });

    it('should maintain parent logger context', () => {
      const childLogger = service.child('ChildContext');

      service.log('Parent message');
      childLogger.log('Child message');

      expect(mockLogFn).toHaveBeenCalledTimes(2);

      const parentLog = mockLogFn.mock.calls[0][0];
      const childLog = mockLogFn.mock.calls[1][0];

      expect(parentLog).toContain('TestContext');
      expect(childLog).toContain('ChildContext');
    });
  });

  describe('Metadata Handling', () => {
    it('should include metadata in logs', () => {
      const metadata = {
        userId: '123',
        action: 'login',
        ip: '192.168.1.1',
      };

      service.log('User logged in', undefined, metadata);

      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('userId');
      expect(logCall).toContain('action');
      expect(logCall).toContain('ip');
    });

    it('should handle empty metadata', () => {
      service.log('Test message', undefined, {});

      expect(mockLogFn).toHaveBeenCalled();
    });

    it('should handle undefined metadata', () => {
      service.log('Test message');

      expect(mockLogFn).toHaveBeenCalled();
    });

    it('should handle complex metadata objects', () => {
      const metadata = {
        user: {
          id: '123',
          email: 'test@example.com',
          roles: ['admin', 'user'],
        },
        request: {
          method: 'POST',
          path: '/api/users',
        },
      };

      service.log('Complex metadata test', undefined, metadata);

      const logCall = mockLogFn.mock.calls[0][0];
      expect(logCall).toContain('user');
      expect(logCall).toContain('request');
    });
  });

  describe('Winston Logger Access', () => {
    it('should provide access to Winston logger instance', () => {
      const winston = service.getWinstonLogger();

      expect(winston).toBeDefined();
      expect(winston).toBe(winstonLogger);
    });
  });

  describe('Error Handling', () => {
    it('should handle Error objects in metadata', () => {
      const error = new Error('Test error');
      const metadata = {
        error: error.message,
        stack: error.stack,
      };

      service.error('Error occurred', error.stack, undefined, metadata);

      expect(mockLogFn).toHaveBeenCalled();
    });

    it('should handle null and undefined values in metadata', () => {
      const metadata = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test',
      };

      service.log('Test with null/undefined', undefined, metadata);

      expect(mockLogFn).toHaveBeenCalled();
    });
  });

  describe('AsyncLocalStorage', () => {
    it('should provide access to AsyncLocalStorage', () => {
      const als = LoggerService.getAsyncLocalStorage();

      expect(als).toBeDefined();
    });

    it('should maintain correlation ID across async operations', async () => {
      const correlationId = 'async-correlation-id';

      await LoggerService.runWithCorrelationId(correlationId, async () => {
        service.log('First log');

        await new Promise((resolve) => setTimeout(resolve, 10));

        service.log('Second log after timeout');

        expect(mockLogFn).toHaveBeenCalledTimes(2);

        const firstLog = mockLogFn.mock.calls[0][0];
        const secondLog = mockLogFn.mock.calls[1][0];

        expect(firstLog).toContain(correlationId);
        expect(secondLog).toContain(correlationId);
      });
    });
  });
});
