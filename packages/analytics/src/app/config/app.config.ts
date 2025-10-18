import { registerAs } from '@nestjs/config';
import { SERVICE_PORTS } from '@orion/shared';

export interface AppConfig {
  port: number;
  environment: string;
  serviceName: string;
  apiPrefix: string;
  corsOrigins: string[];
  retentionDays: {
    events: number;
    metrics: number;
    aggregations: number;
  };
  aggregation: {
    enabled: boolean;
    scheduleInterval: string; // Cron expression
  };
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || String(SERVICE_PORTS.ANALYTICS_SERVICE), 10),
    environment: process.env.NODE_ENV || 'development',
    serviceName: 'analytics',
    apiPrefix: process.env.API_PREFIX || '/api',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    retentionDays: {
      events: parseInt(process.env.EVENTS_RETENTION_DAYS || '90', 10),
      metrics: parseInt(process.env.METRICS_RETENTION_DAYS || '365', 10),
      aggregations: parseInt(process.env.AGGREGATIONS_RETENTION_DAYS || '730', 10), // 2 years
    },
    aggregation: {
      enabled: process.env.AGGREGATION_ENABLED !== 'false',
      scheduleInterval: process.env.AGGREGATION_SCHEDULE || '0 0 * * *', // Daily at midnight
    },
  }),
);
