import { Injectable, Inject, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SecurityModuleOptions } from './interfaces/security-options.interface';

@Injectable()
export class HelmetService implements NestMiddleware {
  private helmetMiddleware: any;

  constructor(
    @Inject('SECURITY_OPTIONS') private readonly options: SecurityModuleOptions,
  ) {
    this.helmetMiddleware = this.configureHelmet();
  }

  private configureHelmet() {
    const helmetConfig = this.options.helmet || {};

    return helmet({
      // Content Security Policy
      contentSecurityPolicy: helmetConfig.contentSecurityPolicy !== false ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", ...(helmetConfig.additionalConnectSrc || [])],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
          ...helmetConfig.cspDirectives,
        },
      } : false,

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false,
      },

      // Frameguard
      frameguard: {
        action: 'deny',
      },

      // Hide Powered-By
      hidePoweredBy: true,

      // HSTS (HTTP Strict Transport Security)
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },

      // IE No Open
      ieNoOpen: true,

      // No Sniff
      noSniff: true,

      // Permitted Cross-Domain Policies
      permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
      },

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // X-XSS-Protection
      xssFilter: true,

      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: helmetConfig.crossOriginEmbedderPolicy !== false,

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: {
        policy: 'same-origin',
      },

      // Origin-Agent-Cluster
      originAgentCluster: true,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.helmetMiddleware(req, res, next);
  }

  /**
   * Get configured helmet middleware for manual application
   */
  getMiddleware() {
    return this.helmetMiddleware;
  }
}
