import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RouteRegistry, RouteConfig } from '../interfaces/route-config.interface';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly routes: RouteRegistry;

  constructor(private readonly configService: ConfigService) {
    // Initialize route registry
    this.routes = this.buildRouteRegistry();
    this.logger.log('Proxy routes initialized');
    Object.keys(this.routes).forEach(pattern => {
      this.logger.log(`  ${pattern} -> ${this.routes[pattern].target}`);
    });
  }

  /**
   * Get route configuration for a given path
   */
  getRouteConfig(path: string): RouteConfig | null {
    // Check each route pattern
    for (const [pattern, config] of Object.entries(this.routes)) {
      if (this.matchRoute(path, pattern)) {
        return config;
      }
    }
    return null;
  }

  /**
   * Get all routes
   */
  getAllRoutes(): RouteRegistry {
    return this.routes;
  }

  /**
   * Rewrite path according to route configuration
   */
  rewritePath(originalPath: string, config: RouteConfig): string {
    if (!config.pathRewrite) {
      return originalPath;
    }

    let rewrittenPath = originalPath;
    for (const [pattern, replacement] of Object.entries(config.pathRewrite)) {
      const regex = new RegExp(pattern);
      rewrittenPath = rewrittenPath.replace(regex, replacement);
    }

    return rewrittenPath;
  }

  /**
   * Match route pattern (supports wildcards)
   */
  private matchRoute(path: string, pattern: string): boolean {
    // Convert pattern with * to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Build route registry from configuration
   */
  private buildRouteRegistry(): RouteRegistry {
    const authServiceUrl = this.configService.get<string>('gateway.AUTH_SERVICE_URL') || 'http://localhost:3001';
    const userServiceUrl = this.configService.get<string>('gateway.USER_SERVICE_URL') || 'http://localhost:3002';
    const notificationServiceUrl = this.configService.get<string>('gateway.NOTIFICATION_SERVICE_URL') || 'http://localhost:3003';

    return {
      '/api/v1/auth/*': {
        target: authServiceUrl,
        pathRewrite: { '^/api/v1/auth': '/api/auth' },
        authRequired: false,
        rateLimit: {
          limit: this.configService.get<number>('gateway.RATE_LIMIT_AUTH_LOGIN', 5),
          window: this.configService.get<number>('gateway.RATE_LIMIT_WINDOW', 60),
        },
      },
      '/api/v1/auth/refresh': {
        target: authServiceUrl,
        pathRewrite: { '^/api/v1/auth': '/api/auth' },
        authRequired: false,
        rateLimit: {
          limit: this.configService.get<number>('gateway.RATE_LIMIT_AUTH_REFRESH', 10),
          window: this.configService.get<number>('gateway.RATE_LIMIT_WINDOW', 60),
        },
      },
      '/api/v1/users/*': {
        target: userServiceUrl,
        pathRewrite: { '^/api/v1/users': '/api/v1/users' },
        authRequired: true,
        rateLimit: {
          limit: 100,
          window: 60,
        },
      },
      '/api/v1/notifications/*': {
        target: notificationServiceUrl,
        pathRewrite: { '^/api/v1/notifications': '/api/v1/notifications' },
        authRequired: true,
        rateLimit: {
          limit: 50,
          window: 60,
        },
      },
    };
  }
}
