import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { UsersController, HealthController } from './users.controller';
import { UserService } from './services/user.service';
import { PreferencesService } from './services/preferences.service';
import { SearchService } from './services/search.service';
import { StorageService } from './services/storage.service';
import { EventPublisherService } from './services/event-publisher.service';
import { CacheService } from './services/cache.service';
import { HealthService } from './services/health.service';
import { UserPrismaService } from './services/user-prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import { getRateLimitConfig } from './config/rate-limit.config';
import { configModules } from './config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: configModules,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot(getRateLimitConfig()),

    // Authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessExpiry'),
          issuer: configService.get('jwt.issuer'),
          audience: configService.get('jwt.audience'),
        },
      }),
    }),
  ],
  controllers: [UsersController, HealthController],
  providers: [
    // Database
    UserPrismaService,

    // Services
    UserService,
    PreferencesService,
    SearchService,
    StorageService,
    EventPublisherService,
    CacheService,
    HealthService,

    // Strategies
    JwtStrategy,

    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global Filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
  ],
  exports: [UserService, PreferencesService, PassportModule, JwtModule],
})
export class AppModule {}
