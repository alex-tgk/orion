import { Injectable, Inject, Logger } from '@nestjs/common';
import { SecurityModuleOptions } from './interfaces/security-options.interface';

@Injectable()
export class SecurityConfigService {
  private readonly logger = new Logger(SecurityConfigService.name);

  constructor(
    @Inject('SECURITY_OPTIONS') private readonly options: SecurityModuleOptions,
  ) {}

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      ttl: this.options.rateLimit?.ttl || 60000,
      limit: this.options.rateLimit?.limit || 10,
      skipIf: this.options.rateLimit?.skipIf,
      ignoreUserAgents: this.options.rateLimit?.ignoreUserAgents || [],
      storage: this.options.rateLimit?.storage,
    };
  }

  /**
   * Get trusted proxies configuration
   */
  getTrustedProxies(): string[] | number | boolean {
    return this.options.trustedProxies || false;
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return process.env['NODE_ENV'] === 'production';
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };

    if (this.options.additionalHeaders) {
      Object.assign(headers, this.options.additionalHeaders);
    }

    return headers;
  }

  /**
   * Get API key validation configuration
   */
  getApiKeyConfig() {
    return {
      enabled: this.options.apiKey?.enabled || false,
      header: this.options.apiKey?.header || 'X-API-Key',
      keys: this.options.apiKey?.keys || [],
    };
  }

  /**
   * Validate API key
   */
  validateApiKey(key: string): boolean {
    const config = this.getApiKeyConfig();

    if (!config.enabled) {
      return true;
    }

    return config.keys.includes(key);
  }

  /**
   * Get request timeout configuration
   */
  getRequestTimeout(): number {
    return this.options.requestTimeout || 30000; // 30 seconds default
  }

  /**
   * Get payload size limits
   */
  getPayloadLimits() {
    return {
      json: this.options.payloadLimits?.json || '100kb',
      urlencoded: this.options.payloadLimits?.urlencoded || '100kb',
      raw: this.options.payloadLimits?.raw || '100kb',
      text: this.options.payloadLimits?.text || '100kb',
    };
  }

  /**
   * Check if IP is whitelisted
   */
  isIpWhitelisted(ip: string): boolean {
    if (!this.options.ipWhitelist || this.options.ipWhitelist.length === 0) {
      return true;
    }

    return this.options.ipWhitelist.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(ip);
      }
      return allowed === ip;
    });
  }

  /**
   * Check if IP is blacklisted
   */
  isIpBlacklisted(ip: string): boolean {
    if (!this.options.ipBlacklist || this.options.ipBlacklist.length === 0) {
      return false;
    }

    return this.options.ipBlacklist.some((blocked) => {
      if (blocked instanceof RegExp) {
        return blocked.test(ip);
      }
      return blocked === ip;
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, details: any) {
    this.logger.warn(`Security Event: ${event}`, details);
  }
}
