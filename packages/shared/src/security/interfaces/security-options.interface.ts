import { ModuleMetadata } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

export interface RateLimitOptions {
  ttl: number; // Time to live in milliseconds
  limit: number; // Maximum number of requests
  skipIf?: (request: any) => boolean;
  ignoreUserAgents?: RegExp[];
  storage?: ThrottlerStorage;
}

export interface HelmetOptions {
  contentSecurityPolicy?: boolean | {
    directives?: Record<string, string[]>;
  };
  cspDirectives?: Record<string, string[]>;
  additionalConnectSrc?: string[];
  crossOriginEmbedderPolicy?: boolean;
}

export interface CorsOptions {
  allowedOrigins?: string[] | RegExp[] | boolean;
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface ApiKeyOptions {
  enabled: boolean;
  header?: string;
  keys: string[];
}

export interface PayloadLimits {
  json?: string;
  urlencoded?: string;
  raw?: string;
  text?: string;
}

export interface SecurityModuleOptions {
  rateLimit?: RateLimitOptions;
  helmet?: HelmetOptions;
  cors?: CorsOptions;
  apiKey?: ApiKeyOptions;
  trustedProxies?: string[] | number | boolean;
  requestTimeout?: number;
  payloadLimits?: PayloadLimits;
  ipWhitelist?: (string | RegExp)[];
  ipBlacklist?: (string | RegExp)[];
  additionalHeaders?: Record<string, string>;
}

export interface SecurityModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<SecurityModuleOptions> | SecurityModuleOptions;
  inject?: any[];
}
