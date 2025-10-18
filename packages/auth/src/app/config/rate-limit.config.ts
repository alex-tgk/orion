import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const getRateLimitConfig = (): ThrottlerModuleOptions => {
  return [
    {
      name: 'short',
      ttl: parseInt(process.env.RATE_LIMIT_SHORT_TTL || '1000', 10), // 1 second
      limit: parseInt(process.env.RATE_LIMIT_SHORT_MAX || '3', 10), // 3 requests
    },
    {
      name: 'medium',
      ttl: parseInt(process.env.RATE_LIMIT_MEDIUM_TTL || '10000', 10), // 10 seconds
      limit: parseInt(process.env.RATE_LIMIT_MEDIUM_MAX || '20', 10), // 20 requests
    },
    {
      name: 'long',
      ttl: parseInt(process.env.RATE_LIMIT_LONG_TTL || '60000', 10), // 1 minute
      limit: parseInt(process.env.RATE_LIMIT_LONG_MAX || '100', 10), // 100 requests
    },
  ];
};

// Specific rate limits for sensitive endpoints
export const RATE_LIMITS = {
  LOGIN: {
    ttl: 60000, // 1 minute
    limit: 5, // 5 login attempts per minute
  },
  REFRESH: {
    ttl: 60000, // 1 minute
    limit: 10, // 10 refresh attempts per minute
  },
  DEFAULT: {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
  },
} as const;