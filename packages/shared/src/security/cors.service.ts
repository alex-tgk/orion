import { Injectable, Inject } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { SecurityModuleOptions } from './interfaces/security-options.interface';

@Injectable()
export class CorsService {
  constructor(
    @Inject('SECURITY_OPTIONS') private readonly options: SecurityModuleOptions,
  ) {}

  /**
   * Get CORS configuration
   */
  getCorsOptions(): CorsOptions {
    const corsConfig = this.options.cors || {};

    return {
      origin: corsConfig.allowedOrigins || this.getDefaultOrigins(),
      methods: corsConfig.allowedMethods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: corsConfig.allowedHeaders || [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'X-Request-ID',
      ],
      exposedHeaders: corsConfig.exposedHeaders || [
        'X-Request-ID',
        'X-Response-Time',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      credentials: corsConfig.credentials !== false,
      maxAge: corsConfig.maxAge || 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  }

  /**
   * Get default allowed origins based on environment
   */
  private getDefaultOrigins(): string[] | boolean {
    const env = process.env['NODE_ENV'] || 'development';

    if (env === 'production') {
      return [
        'https://orion.example.com',
        'https://admin.orion.example.com',
        'https://api.orion.example.com',
      ];
    }

    if (env === 'staging') {
      return [
        'https://staging.orion.example.com',
        'https://admin.staging.orion.example.com',
      ];
    }

    // Development - allow all origins
    return true;
  }

  /**
   * Dynamic origin validation
   */
  validateOrigin(origin: string): boolean {
    const corsConfig = this.options.cors;

    if (!corsConfig || !corsConfig.allowedOrigins) {
      return true;
    }

    const allowedOrigins = corsConfig.allowedOrigins;

    if (Array.isArray(allowedOrigins)) {
      return allowedOrigins.some((allowed) => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
    }

    return allowedOrigins === true;
  }

  /**
   * CORS middleware factory with dynamic validation
   */
  getDynamicCorsOptions(): CorsOptions {
    return {
      ...this.getCorsOptions(),
      origin: (origin, callback) => {
        if (!origin || this.validateOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
    };
  }
}
