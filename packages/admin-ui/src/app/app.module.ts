import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PortRegistryModule, EventBusModule } from '@orion/shared';

// Core Modules
import { AdminUIBackendModule } from './backend.module';
import { WebSocketModule } from './websocket.module';
import { UserManagementModule } from './user-management.module';
import { ConfigurationModule } from './configuration.module';

// Guards and Interceptors
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { WebSocketExceptionFilter } from './filters/websocket-exception.filter';

// Configuration
import { adminUiConfig } from './config/admin-ui.config';
import { jwtConfig } from './config/jwt.config';

/**
 * Main Application Module for Admin UI
 *
 * This module orchestrates all the components of the admin UI service,
 * including REST API endpoints, WebSocket gateways, authentication,
 * and real-time monitoring capabilities.
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [adminUiConfig, jwtConfig],
      cache: true,
      expandVariables: true,
    }),

    // JWT Authentication
    JwtModule.registerAsync({
      useFactory: (config) => ({
        secret: config.get('jwt.secret'),
        signOptions: {
          expiresIn: config.get('jwt.expiresIn', '24h'),
          issuer: 'orion-admin-ui',
        },
      }),
      inject: [ConfigModule],
    }),

    // Shared ORION modules
    PortRegistryModule,
    EventBusModule,

    // Feature modules
    AdminUIBackendModule,
    WebSocketModule,
    UserManagementModule,
    ConfigurationModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // Global Filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: WebSocketExceptionFilter,
    },
  ],
})
export class AppModule {}