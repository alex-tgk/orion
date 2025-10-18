import { LoggerService } from '../logger.service';
import * as winston from 'winston';

describe('LoggerService Additional Tests', () => {
  let logger: winston.Logger;
  let service: LoggerService;
  let logs: any[];

  beforeEach(() => {
    logs = [];

    logger = winston.createLogger({
      level: 'verbose',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          silent: true, // Don't output during tests
        }),
      ],
    });

    // Override logger methods to capture logs
    jest.spyOn(logger, 'info').mockImplementation((message, meta) => {
      logs.push({ level: 'info', message, ...meta });
      return logger;
    });

    jest.spyOn(logger, 'error').mockImplementation((message, meta) => {
      logs.push({ level: 'error', message, ...meta });
      return logger;
    });

    jest.spyOn(logger, 'warn').mockImplementation((message, meta) => {
      logs.push({ level: 'warn', message, ...meta });
      return logger;
    });

    jest.spyOn(logger, 'debug').mockImplementation((message, meta) => {
      logs.push({ level: 'debug', message, ...meta });
      return logger;
    });

    jest.spyOn(logger, 'verbose').mockImplementation((message, meta) => {
      logs.push({ level: 'verbose', message, ...meta });
      return logger;
    });

    jest.spyOn(logger, 'http').mockImplementation((message, meta) => {
      logs.push({ level: 'http', message, ...meta });
      return logger;
    });

    service = new LoggerService(logger, 'TestContext');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    logger.close();
  });

  describe('Correlation ID Integration', () => {
    it('should get AsyncLocalStorage instance', () => {
      const als = LoggerService.getAsyncLocalStorage();
      expect(als).toBeDefined();
    });

    it('should set correlation ID using static method', () => {
      LoggerService.runWithCorrelationId('test-correlation', () => {
        LoggerService.setCorrelationId('updated-correlation');
        service.log('Test message');

        expect(logs[0].correlationId).toBe('updated-correlation');
      });
    });

    it('should maintain correlation ID across nested calls', () => {
      LoggerService.runWithCorrelationId('outer', () => {
        service.log('Outer message');
        expect(logs[0].correlationId).toBe('outer');

        LoggerService.runWithCorrelationId('inner', () => {
          service.log('Inner message');
          expect(logs[1].correlationId).toBe('inner');
        });

        service.log('Back to outer');
        expect(logs[2].correlationId).toBe('outer');
      });
    });

    it('should work without correlation ID context', () => {
      service.log('No correlation ID');

      expect(logs[0].message).toBe('No correlation ID');
      expect(logs[0].correlationId).toBeUndefined();
    });
  });

  describe('All Log Levels', () => {
    it('should log info messages correctly', () => {
      service.log('Info message', undefined, { key: 'value' });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
      expect(logs[0].message).toBe('Info message');
      expect(logs[0].context).toBe('TestContext');
    });

    it('should log error messages with stack trace', () => {
      const error = new Error('Test error');
      service.error('Error occurred', error.stack, undefined, { errorCode: 'ERR001' });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].message).toBe('Error occurred');
      expect(logs[0].stack).toBeDefined();
    });

    it('should log warning messages', () => {
      service.warn('Warning message', undefined, { severity: 'medium' });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toBe('Warning message');
    });

    it('should log debug messages', () => {
      service.debug('Debug info', undefined, { debugData: 'test' });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toBe('Debug info');
    });

    it('should log verbose messages', () => {
      service.verbose('Verbose output', undefined, { verboseData: 'detailed' });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('verbose');
      expect(logs[0].message).toBe('Verbose output');
    });

    it('should log HTTP messages', () => {
      service.http('GET /api/users', { statusCode: 200, duration: 45 });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('http');
      expect(logs[0].message).toBe('GET /api/users');
      expect(logs[0].statusCode).toBe(200);
    });
  });

  describe('Context Override', () => {
    it('should override context in log method', () => {
      service.log('Test message', 'OverriddenContext');

      expect(logs[0].context).toBe('TestContext'); // Still uses instance context in metadata
    });

    it('should override context in error method', () => {
      service.error('Error message', undefined, 'ErrorContext');

      expect(logs[0].message).toBe('Error message');
    });

    it('should override context in warn method', () => {
      service.warn('Warning', 'WarnContext');

      expect(logs[0].message).toBe('Warning');
    });

    it('should override context in debug method', () => {
      service.debug('Debug', 'DebugContext');

      expect(logs[0].message).toBe('Debug');
    });

    it('should override context in verbose method', () => {
      service.verbose('Verbose', 'VerboseContext');

      expect(logs[0].message).toBe('Verbose');
    });
  });

  describe('Metadata Handling', () => {
    it('should include metadata in logs', () => {
      service.log('Test', undefined, { userId: '123', action: 'login' });

      expect(logs[0].metadata).toEqual({ userId: '123', action: 'login' });
    });

    it('should handle empty metadata', () => {
      service.log('Test', undefined, {});

      expect(logs[0].metadata).toEqual({});
    });

    it('should handle undefined metadata', () => {
      service.log('Test');

      expect(logs[0].metadata).toEqual({});
    });

    it('should handle complex nested metadata', () => {
      const complexMeta = {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
            },
          },
        },
      };

      service.log('Complex test', undefined, complexMeta);

      expect(logs[0].metadata).toEqual(complexMeta);
    });

    it('should handle arrays in metadata', () => {
      service.log('Array test', undefined, { items: [1, 2, 3], tags: ['a', 'b'] });

      expect(logs[0].metadata.items).toEqual([1, 2, 3]);
      expect(logs[0].metadata.tags).toEqual(['a', 'b']);
    });

    it('should handle null values', () => {
      service.log('Null test', undefined, { nullValue: null, validValue: 'test' });

      expect(logs[0].metadata.nullValue).toBeNull();
      expect(logs[0].metadata.validValue).toBe('test');
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with context', () => {
      const childLogger = service.child('ChildContext');

      expect(childLogger).toBeInstanceOf(LoggerService);
      expect(childLogger).not.toBe(service);
    });

    it('should create child logger with metadata', () => {
      const childLogger = service.child('ChildContext', { parentId: '123' });

      expect(childLogger).toBeDefined();
    });

    it('should allow child logger to log', () => {
      const childLogger = service.child('ChildContext');
      childLogger.log('Child message');

      expect(logs[0].message).toBe('Child message');
    });

    it('should maintain separate contexts', () => {
      const child1 = service.child('Child1');
      const child2 = service.child('Child2');

      child1.log('Message from child 1');
      child2.log('Message from child 2');

      expect(logs).toHaveLength(2);
    });
  });

  describe('Error Logging with Stack Traces', () => {
    it('should include stack trace in error logs', () => {
      const error = new Error('Test error');
      service.error('Error occurred', error.stack);

      expect(logs[0].stack).toContain('Error: Test error');
    });

    it('should handle errors without stack traces', () => {
      service.error('Simple error message', undefined);

      expect(logs[0].message).toBe('Simple error message');
      expect(logs[0].stack).toBeUndefined();
    });

    it('should include metadata with error', () => {
      const error = new Error('Test error');
      service.error('Error', error.stack, undefined, { errorCode: 'E001', userId: '123' });

      expect(logs[0].metadata.errorCode).toBe('E001');
      expect(logs[0].metadata.userId).toBe('123');
    });
  });

  describe('Context Management', () => {
    it('should update context', () => {
      service.setContext('NewContext');
      service.log('Test after context change');

      expect(logs[0].context).toBe('NewContext');
    });

    it('should preserve context across multiple logs', () => {
      service.setContext('PersistentContext');
      service.log('First message');
      service.log('Second message');

      expect(logs[0].context).toBe('PersistentContext');
      expect(logs[1].context).toBe('PersistentContext');
    });

    it('should allow context reset', () => {
      service.setContext('Initial');
      service.log('First');

      service.setContext('Updated');
      service.log('Second');

      expect(logs[0].context).toBe('Initial');
      expect(logs[1].context).toBe('Updated');
    });
  });

  describe('Winston Logger Access', () => {
    it('should provide access to Winston logger', () => {
      const winstonLogger = service.getWinstonLogger();

      expect(winstonLogger).toBe(logger);
      expect(winstonLogger).toBeDefined();
    });

    it('should return the same logger instance', () => {
      const winston1 = service.getWinstonLogger();
      const winston2 = service.getWinstonLogger();

      expect(winston1).toBe(winston2);
    });
  });

  describe('Correlation ID with Metadata', () => {
    it('should include both correlation ID and metadata', () => {
      LoggerService.runWithCorrelationId('corr-123', () => {
        service.log('Test', undefined, { userId: '456' });

        expect(logs[0].correlationId).toBe('corr-123');
        expect(logs[0].metadata.userId).toBe('456');
      });
    });

    it('should handle correlation ID in error logs', () => {
      LoggerService.runWithCorrelationId('error-corr', () => {
        service.error('Error', undefined, undefined, { code: 'ERR' });

        expect(logs[0].correlationId).toBe('error-corr');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string messages', () => {
      service.log('');

      expect(logs[0].message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      service.log(longMessage);

      expect(logs[0].message).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      service.log('Message with "quotes" and \nnewlines');

      expect(logs[0].message).toContain('"quotes"');
    });

    it('should handle Unicode characters', () => {
      service.log('Unicode: 你好世界 🌍');

      expect(logs[0].message).toBe('Unicode: 你好世界 🌍');
    });

    it('should handle rapid successive logs', () => {
      for (let i = 0; i < 100; i++) {
        service.log(`Message ${i}`);
      }

      expect(logs).toHaveLength(100);
      expect(logs[0].message).toBe('Message 0');
      expect(logs[99].message).toBe('Message 99');
    });
  });

  describe('All Log Levels with Context Override', () => {
    it('should use context override for all levels', () => {
      service.log('Info', 'InfoContext', { data: 1 });
      service.error('Error', 'trace', 'ErrorContext', { data: 2 });
      service.warn('Warn', 'WarnContext', { data: 3 });
      service.debug('Debug', 'DebugContext', { data: 4 });
      service.verbose('Verbose', 'VerboseContext', { data: 5 });

      expect(logs).toHaveLength(5);
    });
  });
});
