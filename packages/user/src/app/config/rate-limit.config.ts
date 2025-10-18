import { ThrottlerModuleOptions } from '@nestjs/throttler';

export interface RateLimitConfig extends ThrottlerModuleOptions {
  ttl: number;
  limit: number;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000, // Convert to milliseconds
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  };
}

/**
 * Custom rate limits for specific endpoints
 */
export const CUSTOM_RATE_LIMITS = {
  // Profile update: 20 requests per minute
  UPDATE_PROFILE: {
    ttl: 60 * 1000,
    limit: 20,
  },
  // Search: 50 requests per minute
  SEARCH: {
    ttl: 60 * 1000,
    limit: 50,
  },
  // Avatar upload: 10 requests per minute
  UPLOAD_AVATAR: {
    ttl: 60 * 1000,
    limit: 10,
  },
  // Delete profile: 5 requests per minute
  DELETE_PROFILE: {
    ttl: 60 * 1000,
    limit: 5,
  },
} as const;
