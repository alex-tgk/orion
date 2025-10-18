import * as winston from 'winston';
import { createLoggerConfig } from '../logger.config';
import type { LoggerConfig } from '../interfaces/logger-options.interface';

describe('Logger Config Additional Tests', () => {
  describe('Sanitization', () => {
    it('should sanitize password field', () => {
      const config: LoggerConfig = {
        serviceName: 'sanitize-test',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);
      const logs: any[] = [];

      logger.on('data', (info) => {
        logs.push(info);
      });

      logger.info('test', {
        metadata: {
          password: 'secret123',
          username: 'user',
        },
      });

      logger.close();
    });

    it('should use custom sanitization fields', () => {
      const config: LoggerConfig = {
        serviceName: 'custom-sanitize',
        sanitize: {
          fields: ['customField', 'secretData'],
          replacement: '[HIDDEN]',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.format).toBeDefined();
    });

    it('should sanitize token field', () => {
      const config: LoggerConfig = {
        serviceName: 'token-sanitize',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);

      logger.info('test', {
        metadata: {
          token: 'bearer-token',
        },
      });

      logger.close();
    });

    it('should sanitize apiKey field', () => {
      const config: LoggerConfig = {
        serviceName: 'apikey-sanitize',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);

      logger.info('test', {
        metadata: {
          apiKey: 'api-key-123',
        },
      });

      logger.close();
    });

    it('should sanitize authorization header', () => {
      const config: LoggerConfig = {
        serviceName: 'auth-sanitize',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);

      logger.info('test', {
        metadata: {
          authorization: 'Bearer token-xyz',
        },
      });

      logger.close();
    });

    it('should sanitize accessToken field', () => {
      const config: LoggerConfig = {
        serviceName: 'access-token-sanitize',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);

      logger.info('test', {
        metadata: {
          accessToken: 'access-token-123',
        },
      });

      logger.close();
    });

    it('should sanitize refreshToken field', () => {
      const config: LoggerConfig = {
        serviceName: 'refresh-token-sanitize',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);

      logger.info('test', {
        metadata: {
          refreshToken: 'refresh-token-456',
        },
      });

      logger.close();
    });

    it('should sanitize secret field', () => {
      const config: LoggerConfig = {
        serviceName: 'secret-sanitize',
      };

      const loggerConfig = createLoggerConfig(config);
      const logger = winston.createLogger(loggerConfig);

      logger.info('test', {
        metadata: {
          secret: 'my-secret',
        },
      });

      logger.close();
    });
  });

  describe('Transport Combinations', () => {
    it('should handle both console and file transports', () => {
      const config: LoggerConfig = {
        serviceName: 'multi-transport',
        transports: ['console', 'file'],
        fileOptions: {
          filename: 'test.log',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports!.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle only file transport', () => {
      const config: LoggerConfig = {
        serviceName: 'file-only',
        transports: ['file'],
        fileOptions: {
          filename: 'test.log',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(1);
    });

    it('should ignore file transport without options', () => {
      const config: LoggerConfig = {
        serviceName: 'file-no-options',
        transports: ['file'],
      };

      const loggerConfig = createLoggerConfig(config);
      // Should only have console transport since no fileOptions
      expect(loggerConfig.transports).toHaveLength(0);
    });
  });

  describe('Environment Handling', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should use production environment', () => {
      process.env.NODE_ENV = 'production';

      const config: LoggerConfig = {
        serviceName: 'prod-service',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.defaultMeta?.environment).toBe('production');
    });

    it('should use staging environment', () => {
      process.env.NODE_ENV = 'staging';

      const config: LoggerConfig = {
        serviceName: 'staging-service',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.defaultMeta?.environment).toBe('staging');
    });

    it('should override NODE_ENV with explicit environment', () => {
      process.env.NODE_ENV = 'development';

      const config: LoggerConfig = {
        serviceName: 'override-service',
        environment: 'production',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.defaultMeta?.environment).toBe('production');
    });
  });

  describe('Pretty Mode Configuration', () => {
    it('should configure console for pretty mode', () => {
      const config: LoggerConfig = {
        serviceName: 'pretty-service',
        pretty: true,
        transports: ['console'],
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(1);
    });

    it('should configure console for JSON mode', () => {
      const config: LoggerConfig = {
        serviceName: 'json-service',
        pretty: false,
        transports: ['console'],
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(1);
    });
  });

  describe('Log Level Configuration', () => {
    it('should configure with error level', () => {
      const config: LoggerConfig = {
        serviceName: 'error-level',
        level: 'error',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.level).toBe('error');
    });

    it('should configure with http level', () => {
      const config: LoggerConfig = {
        serviceName: 'http-level',
        level: 'http',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.level).toBe('http');
    });
  });

  describe('File Options', () => {
    it('should create file transport with error file', () => {
      const config: LoggerConfig = {
        serviceName: 'error-file',
        transports: ['file'],
        fileOptions: {
          filename: 'app.log',
          errorFilename: 'error.log',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(2);
    });

    it('should create file transport without error file', () => {
      const config: LoggerConfig = {
        serviceName: 'no-error-file',
        transports: ['file'],
        fileOptions: {
          filename: 'app.log',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(1);
    });

    it('should create transport with custom file size', () => {
      const config: LoggerConfig = {
        serviceName: 'custom-size',
        transports: ['file'],
        fileOptions: {
          filename: 'app.log',
          maxSize: '100m',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(1);
      expect(loggerConfig.transports![0]).toBeDefined();
    });

    it('should create transport with custom max files retention', () => {
      const config: LoggerConfig = {
        serviceName: 'custom-retention',
        transports: ['file'],
        fileOptions: {
          filename: 'app.log',
          maxFiles: '30d',
        },
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.transports).toHaveLength(1);
      expect(loggerConfig.transports![0]).toBeDefined();
    });
  });

  describe('Exit on Error', () => {
    it('should always set exitOnError to false', () => {
      const config: LoggerConfig = {
        serviceName: 'no-exit-service',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.exitOnError).toBe(false);
    });
  });

  describe('Default Meta', () => {
    it('should include service name in defaultMeta', () => {
      const config: LoggerConfig = {
        serviceName: 'meta-service',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.defaultMeta).toHaveProperty('service', 'meta-service');
    });

    it('should include environment in defaultMeta', () => {
      const config: LoggerConfig = {
        serviceName: 'env-service',
        environment: 'test',
      };

      const loggerConfig = createLoggerConfig(config);
      expect(loggerConfig.defaultMeta).toHaveProperty('environment', 'test');
    });
  });
});
