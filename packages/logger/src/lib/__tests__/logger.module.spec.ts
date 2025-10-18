import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule, LOGGER_MODULE_OPTIONS, WINSTON_LOGGER } from '../logger.module';
import { LoggerService } from '../logger.service';
import type { LoggerModuleOptions } from '../interfaces/logger-options.interface';
import * as winston from 'winston';

describe('LoggerModule', () => {
  describe('forRoot', () => {
    let module: TestingModule;
    let loggerService: LoggerService;

    const config: LoggerModuleOptions = {
      serviceName: 'test-service',
      level: 'info',
      pretty: false,
      transports: ['console'],
      isGlobal: true,
    };

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [LoggerModule.forRoot(config)],
      }).compile();

      loggerService = module.get<LoggerService>(LoggerService);
    });

    it('should provide LoggerService', () => {
      expect(loggerService).toBeDefined();
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should provide WINSTON_LOGGER', () => {
      const winstonLogger = module.get(WINSTON_LOGGER);
      expect(winstonLogger).toBeDefined();
    });

    it('should provide LOGGER_MODULE_OPTIONS', () => {
      const options = module.get(LOGGER_MODULE_OPTIONS);
      expect(options).toBeDefined();
      expect(options).toEqual(config);
    });

    it('should configure Winston with correct service name', () => {
      const winstonLogger = module.get<winston.Logger>(WINSTON_LOGGER);
      const defaultMeta = winstonLogger.defaultMeta as any;

      expect(defaultMeta).toBeDefined();
      expect(defaultMeta.service).toBe('test-service');
    });

    it('should use default isGlobal as true', async () => {
      const configWithoutGlobal: LoggerModuleOptions = {
        serviceName: 'test-service',
      };

      const testModule = await Test.createTestingModule({
        imports: [LoggerModule.forRoot(configWithoutGlobal)],
      }).compile();

      const service = testModule.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    let module: TestingModule;
    let loggerService: LoggerService;

    const asyncConfig: LoggerModuleOptions = {
      serviceName: 'async-test-service',
      level: 'debug',
      pretty: true,
      transports: ['console'],
    };

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            useFactory: () => asyncConfig,
          }),
        ],
      }).compile();

      loggerService = module.get<LoggerService>(LoggerService);
    });

    it('should provide LoggerService from async config', () => {
      expect(loggerService).toBeDefined();
      expect(loggerService).toBeInstanceOf(LoggerService);
    });

    it('should configure Winston with async config', () => {
      const winstonLogger = module.get<winston.Logger>(WINSTON_LOGGER);
      const defaultMeta = winstonLogger.defaultMeta as any;

      expect(defaultMeta).toBeDefined();
      expect(defaultMeta.service).toBe('async-test-service');
    });

    it('should support async factory with Promise', async () => {
      const asyncModule = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            useFactory: async () => {
              // Simulate async config loading
              await new Promise((resolve) => setTimeout(resolve, 10));
              return asyncConfig;
            },
          }),
        ],
      }).compile();

      const service = asyncModule.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });

    it('should support dependency injection in factory', async () => {
      class ConfigService {
        getLoggerConfig(): LoggerModuleOptions {
          return asyncConfig;
        }
      }

      const asyncModule = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            imports: [
              {
                module: class ConfigModule {},
                providers: [ConfigService],
                exports: [ConfigService],
              },
            ],
            useFactory: (configService: ConfigService) => {
              return configService.getLoggerConfig();
            },
            inject: [ConfigService],
          }),
        ],
      }).compile();

      const service = asyncModule.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });
  });

  describe('Module Configuration', () => {
    it('should configure console transport', async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRoot({
            serviceName: 'console-test',
            transports: ['console'],
          }),
        ],
      }).compile();

      const winstonLogger = module.get<winston.Logger>(WINSTON_LOGGER);
      expect(winstonLogger.transports).toHaveLength(1);
    });

    it('should configure with custom log level', async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRoot({
            serviceName: 'level-test',
            level: 'error',
          }),
        ],
      }).compile();

      const winstonLogger = module.get<winston.Logger>(WINSTON_LOGGER);
      expect(winstonLogger.level).toBe('error');
    });

    it('should configure with pretty printing', async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRoot({
            serviceName: 'pretty-test',
            pretty: true,
          }),
        ],
      }).compile();

      const service = module.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });

    it('should configure with environment', async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRoot({
            serviceName: 'env-test',
            environment: 'production',
          }),
        ],
      }).compile();

      const winstonLogger = module.get<winston.Logger>(WINSTON_LOGGER);
      const defaultMeta = winstonLogger.defaultMeta as any;

      expect(defaultMeta.environment).toBe('production');
    });

    it('should use default environment from NODE_ENV', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRoot({
            serviceName: 'default-env-test',
          }),
        ],
      }).compile();

      const winstonLogger = module.get<winston.Logger>(WINSTON_LOGGER);
      const defaultMeta = winstonLogger.defaultMeta as any;

      expect(defaultMeta.environment).toBe('test');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Global Module', () => {
    it('should be global by default', async () => {
      const dynamicModule = LoggerModule.forRoot({
        serviceName: 'global-test',
      });

      expect(dynamicModule.global).toBe(true);
    });

    it('should respect isGlobal: false', async () => {
      const dynamicModule = LoggerModule.forRoot({
        serviceName: 'local-test',
        isGlobal: false,
      });

      expect(dynamicModule.global).toBe(false);
    });
  });

  describe('Exports', () => {
    it('should export LoggerService', async () => {
      const dynamicModule = LoggerModule.forRoot({
        serviceName: 'export-test',
      });

      expect(dynamicModule.exports).toContain(LoggerService);
    });

    it('should export WINSTON_LOGGER', async () => {
      const dynamicModule = LoggerModule.forRoot({
        serviceName: 'export-test',
      });

      expect(dynamicModule.exports).toContain(WINSTON_LOGGER);
    });
  });
});
