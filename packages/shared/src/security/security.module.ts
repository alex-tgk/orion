import { Module, DynamicModule, Global } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HelmetService } from './helmet.service';
import { CorsService } from './cors.service';
import { SecurityConfigService } from './security-config.service';
import { SecurityModuleOptions, SecurityModuleAsyncOptions } from './interfaces/security-options.interface';

@Global()
@Module({})
export class SecurityModule {
  static forRoot(options: SecurityModuleOptions): DynamicModule {
    return {
      module: SecurityModule,
      imports: [
        ConfigModule,
        ThrottlerModule.forRoot([
          {
            ttl: options.rateLimit?.ttl || 60000,
            limit: options.rateLimit?.limit || 10,
          },
        ]),
      ],
      providers: [
        {
          provide: 'SECURITY_OPTIONS',
          useValue: options,
        },
        HelmetService,
        CorsService,
        SecurityConfigService,
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
      exports: [HelmetService, CorsService, SecurityConfigService, ThrottlerModule],
    };
  }

  static forRootAsync(options: SecurityModuleAsyncOptions): DynamicModule {
    return {
      module: SecurityModule,
      imports: [
        ConfigModule,
        ThrottlerModule.forRootAsync({
          imports: options.imports || [],
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return [
              {
                ttl: config.rateLimit?.ttl || 60000,
                limit: config.rateLimit?.limit || 10,
              },
            ];
          },
          inject: options.inject || [],
        }),
        ...(options.imports || []),
      ],
      providers: [
        {
          provide: 'SECURITY_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        HelmetService,
        CorsService,
        SecurityConfigService,
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
      exports: [HelmetService, CorsService, SecurityConfigService, ThrottlerModule],
    };
  }
}
