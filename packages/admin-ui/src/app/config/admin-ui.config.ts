import { registerAs } from '@nestjs/config';

export const adminUiConfig = registerAs('adminUi', () => ({
  port: parseInt(process.env.ADMIN_UI_PORT || '3000', 10),
  host: process.env.ADMIN_UI_HOST || '0.0.0.0',

  // WebSocket Configuration
  websocket: {
    cors: {
      origin: process.env.WEBSOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '10000', 10),
    pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT || '5000', 10),
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6, // 1MB
  },

  // Service Discovery
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000', 10),
    },
    gateway: {
      url: process.env.GATEWAY_SERVICE_URL || 'http://localhost:3005',
      timeout: parseInt(process.env.GATEWAY_SERVICE_TIMEOUT || '5000', 10),
    },
    user: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '5000', 10),
    },
    notification: {
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT || '5000', 10),
    },
  },

  // Monitoring
  monitoring: {
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    metricsCollectionInterval: parseInt(process.env.METRICS_INTERVAL || '10000', 10),
    eventRetentionDays: parseInt(process.env.EVENT_RETENTION_DAYS || '30', 10),
    maxEventsPerQuery: parseInt(process.env.MAX_EVENTS_PER_QUERY || '1000', 10),
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    max: parseInt(process.env.CACHE_MAX_ITEMS || '100', 10),
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10), // 10 minutes
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production',
    redactPaths: ['password', 'token', 'secret', 'authorization'],
  },

  // Frontend Configuration
  frontend: {
    apiUrl: process.env.FRONTEND_API_URL || '/api',
    wsUrl: process.env.FRONTEND_WS_URL || 'ws://localhost:3000',
    publicPath: process.env.FRONTEND_PUBLIC_PATH || '/admin',
  },
}))