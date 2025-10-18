import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { createLogger } from 'winston';
import { LoggerService } from './logger.service';
import { createLoggerConfig } from './logger.config';
import type { LoggerModuleOptions } from './interfaces/logger-options.interface';

/**
 * Logger module constants
 */
export const LOGGER_MODULE_OPTIONS = 'LOGGER_MODULE_OPTIONS';
export const WINSTON_LOGGER = 'WINSTON_LOGGER';

/**
 * Logger Module for NestJS
 * Provides centralized logging with Winston
 */
@Global()
@Module({})
export class LoggerModule {
  /**
   * Configure LoggerModule with options
   * @param options - Logger configuration options
   */
  static forRoot(options: LoggerModuleOptions): DynamicModule {
    const loggerOptionsProvider: Provider = {
      provide: LOGGER_MODULE_OPTIONS,
      useValue: options,
    };

    const winstonLoggerProvider: Provider = {
      provide: WINSTON_LOGGER,
      useFactory: () => {
        const loggerConfig = createLoggerConfig(options);
        return createLogger(loggerConfig);
      },
    };

    const loggerServiceProvider: Provider = {
      provide: LoggerService,
      useFactory: (winstonLogger) => {
        return new LoggerService(winstonLogger);
      },
      inject: [WINSTON_LOGGER],
    };

    return {
      module: LoggerModule,
      global: options.isGlobal !== false,
      providers: [loggerOptionsProvider, winstonLoggerProvider, loggerServiceProvider],
      exports: [LoggerService, WINSTON_LOGGER],
    };
  }

  /**
   * Configure LoggerModule asynchronously
   * @param options - Async logger configuration options
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<LoggerModuleOptions> | LoggerModuleOptions;
    inject?: any[];
    imports?: any[];
  }): DynamicModule {
    const asyncProviders: Provider[] = [
      {
        provide: LOGGER_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
      {
        provide: WINSTON_LOGGER,
        useFactory: (loggerOptions: LoggerModuleOptions) => {
          const loggerConfig = createLoggerConfig(loggerOptions);
          return createLogger(loggerConfig);
        },
        inject: [LOGGER_MODULE_OPTIONS],
      },
      {
        provide: LoggerService,
        useFactory: (winstonLogger) => {
          return new LoggerService(winstonLogger);
        },
        inject: [WINSTON_LOGGER],
      },
    ];

    return {
      module: LoggerModule,
      global: true,
      imports: options.imports || [],
      providers: asyncProviders,
      exports: [LoggerService, WINSTON_LOGGER],
    };
  }
}
