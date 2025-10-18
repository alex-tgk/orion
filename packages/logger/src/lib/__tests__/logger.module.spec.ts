import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule, WINSTON_LOGGER, LOGGER_MODULE_OPTIONS } from '../logger.module';
import { LoggerService } from '../logger.service';
import type { LoggerModuleOptions } from '../interfaces/logger-options.interface';

describe('LoggerModule', () => {
  describe('forRoot', () => {
    it('should provide LoggerService', async () => {
      const config: LoggerModuleOptions = {
        serviceName: 'test-service',
        level: 'info',
      };

      const module = await Test.createTestingModule({
        imports: [LoggerModule.forRoot(config)],
      }).compile();

      const service = module.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(LoggerService);
    });

    it('should provide WINSTON_LOGGER', async () => {
      const config: LoggerModuleOptions = {
        serviceName: 'test-service',
      };

      const module = await Test.createTestingModule({
        imports: [LoggerModule.forRoot(config)],
      }).compile();

      const logger = module.get(WINSTON_LOGGER);
      expect(logger).toBeDefined();
    });

    it('should provide LOGGER_MODULE_OPTIONS', async () => {
      const config: LoggerModuleOptions = {
        serviceName: 'test-service',
        level: 'debug',
      };

      const module = await Test.createTestingModule({
        imports: [LoggerModule.forRoot(config)],
      }).compile();

      const options = module.get(LOGGER_MODULE_OPTIONS);
      expect(options).toEqual(config);
    });

    it('should be global by default', () => {
      const module = LoggerModule.forRoot({
        serviceName: 'global-service',
      });

      expect(module.global).toBe(true);
    });

    it('should respect isGlobal: false', () => {
      const module = LoggerModule.forRoot({
        serviceName: 'local-service',
        isGlobal: false,
      });

      expect(module.global).toBe(false);
    });

    it('should export LoggerService', () => {
      const module = LoggerModule.forRoot({
        serviceName: 'test',
      });

      expect(module.exports).toContain(LoggerService);
    });

    it('should export WINSTON_LOGGER', () => {
      const module = LoggerModule.forRoot({
        serviceName: 'test',
      });

      expect(module.exports).toContain(WINSTON_LOGGER);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async config', async () => {
      const config: LoggerModuleOptions = {
        serviceName: 'async-service',
        level: 'debug',
      };

      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            useFactory: () => config,
          }),
        ],
      }).compile();

      const service = module.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });

    it('should support Promise in factory', async () => {
      const config: LoggerModuleOptions = {
        serviceName: 'promise-service',
      };

      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            useFactory: async () => {
              return Promise.resolve(config);
            },
          }),
        ],
      }).compile();

      const service = module.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });

    it('should support dependency injection', async () => {
      class ConfigService {
        getConfig(): LoggerModuleOptions {
          return {
            serviceName: 'injected-service',
            level: 'info',
          };
        }
      }

      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            imports: [
              {
                module: class TestModule {},
                providers: [ConfigService],
                exports: [ConfigService],
              },
            ],
            useFactory: (configService: ConfigService) => {
              return configService.getConfig();
            },
            inject: [ConfigService],
          }),
        ],
      }).compile();

      const service = module.get<LoggerService>(LoggerService);
      expect(service).toBeDefined();
    });

    it('should be global by default for async', async () => {
      const module = await Test.createTestingModule({
        imports: [
          LoggerModule.forRootAsync({
            useFactory: () => ({ serviceName: 'test' }),
          }),
        ],
      }).compile();

      expect(module).toBeDefined();
    });
  });
});
