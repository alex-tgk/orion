import { Injectable, Logger, NestMiddleware, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtCacheService } from '../services/jwt-cache.service';
import { ProxyService } from '../services/proxy.service';
import { RequestContext } from '../interfaces/request-context.interface';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly jwtCacheService: JwtCacheService,
    private readonly proxyService: ProxyService
  ) {}

  async use(req: RequestContext, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if route requires authentication
      const routeConfig = this.proxyService.getRouteConfig(req.path);

      if (!routeConfig || !routeConfig.authRequired) {
        // Route doesn't require auth, proceed
        return next();
      }

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing or invalid Authorization header');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token (with caching)
      try {
        const validatedToken = await this.jwtCacheService.validateToken(token);

        // Attach user info to request
        req.user = {
          userId: validatedToken.userId,
          email: validatedToken.email,
          iat: validatedToken.iat,
          exp: validatedToken.exp,
        };

        this.logger.debug(`Authenticated user ${validatedToken.email}`);
        next();
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }

        // Auth service unavailable
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message: 'Authentication service unavailable',
            error: 'Service Unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
