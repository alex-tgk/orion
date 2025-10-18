import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

/**
 * Guard to protect webhook endpoints with API key
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('WEBHOOK_API_KEY', '');
  }

  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!this.apiKey) {
      // If no API key configured, allow access (development mode)
      return true;
    }

    if (!apiKey || apiKey !== this.apiKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }

  /**
   * Extract API key from request
   * Supports both header and bearer token
   */
  private extractApiKey(request: any): string | undefined {
    // Check X-API-Key header
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey;
    }

    // Check Authorization: Bearer <key>
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
