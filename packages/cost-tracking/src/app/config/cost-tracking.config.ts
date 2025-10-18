import { registerAs } from '@nestjs/config';

export interface CloudProviderPricing {
  provider: 'aws' | 'gcp' | 'azure' | 'on-premise';
  region: string;
  pricing: {
    cpu: {
      perCore: number; // USD per core-hour
      unit: 'core-hour';
    };
    memory: {
      perGb: number; // USD per GB-hour
      unit: 'gb-hour';
    };
    storage: {
      perGb: number; // USD per GB-month
      unit: 'gb-month';
    };
    database: {
      iops: number; // USD per IOPS-month
      storage: number; // USD per GB-month
      connections: number; // USD per connection-hour
    };
    network: {
      ingress: number; // USD per GB (usually free)
      egress: number; // USD per GB
      loadBalancer: number; // USD per hour
    };
    apiGateway: {
      requests: number; // USD per million requests
      bandwidth: number; // USD per GB
    };
    cicd: {
      buildMinutes: number; // USD per minute
    };
  };
}

export default registerAs('costTracking', () => ({
  // Service configuration
  port: parseInt(process.env.COST_TRACKING_PORT || '20010', 10),

  // Database
  databaseUrl: process.env.COST_TRACKING_DATABASE_URL || 'postgresql://localhost:5432/orion_cost_tracking',

  // Kubernetes configuration
  kubernetes: {
    enabled: process.env.K8S_METRICS_ENABLED === 'true',
    metricsServer: process.env.K8S_METRICS_SERVER || 'http://metrics-server.kube-system:443',
    namespace: process.env.K8S_NAMESPACE || 'default',
    pollInterval: parseInt(process.env.K8S_POLL_INTERVAL || '300000', 10), // 5 minutes
  },

  // Database monitoring
  database: {
    enabled: true,
    pollInterval: parseInt(process.env.DB_POLL_INTERVAL || '300000', 10), // 5 minutes
  },

  // Cloud provider pricing
  providers: [
    {
      provider: 'on-premise',
      region: 'local',
      pricing: {
        cpu: {
          perCore: 0.05, // $0.05 per core-hour (estimated)
          unit: 'core-hour',
        },
        memory: {
          perGb: 0.01, // $0.01 per GB-hour (estimated)
          unit: 'gb-hour',
        },
        storage: {
          perGb: 0.02, // $0.02 per GB-month (estimated)
          unit: 'gb-month',
        },
        database: {
          iops: 0.0001, // $0.0001 per IOPS-month
          storage: 0.025, // $0.025 per GB-month
          connections: 0.001, // $0.001 per connection-hour
        },
        network: {
          ingress: 0,
          egress: 0.001, // $0.001 per GB
          loadBalancer: 0.025, // $0.025 per hour
        },
        apiGateway: {
          requests: 0.001, // $0.001 per million requests
          bandwidth: 0.001, // $0.001 per GB
        },
        cicd: {
          buildMinutes: 0.005, // $0.005 per minute
        },
      },
    } as CloudProviderPricing,
  ] as CloudProviderPricing[],

  // Budget alerts
  alerts: {
    enabled: true,
    checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '3600000', 10), // 1 hour
    emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    slackEnabled: process.env.ALERT_SLACK_ENABLED === 'true',
    slackWebhook: process.env.ALERT_SLACK_WEBHOOK || '',
  },

  // Cost forecasting
  forecasting: {
    enabled: true,
    method: process.env.FORECAST_METHOD || 'linear_regression',
    forecastDays: parseInt(process.env.FORECAST_DAYS || '30', 10),
    confidenceLevel: parseFloat(process.env.FORECAST_CONFIDENCE || '0.95'),
  },

  // Cost optimization
  optimization: {
    enabled: true,
    scanInterval: parseInt(process.env.OPTIMIZATION_SCAN_INTERVAL || '86400000', 10), // 24 hours
    minSavingsThreshold: parseFloat(process.env.MIN_SAVINGS_THRESHOLD || '10'), // $10
  },

  // Data retention
  retention: {
    rawMetrics: parseInt(process.env.RETENTION_RAW_METRICS || '7', 10), // days
    hourlyAggregates: parseInt(process.env.RETENTION_HOURLY || '30', 10), // days
    dailyAggregates: parseInt(process.env.RETENTION_DAILY || '365', 10), // days
    monthlyAggregates: parseInt(process.env.RETENTION_MONTHLY || '1825', 10), // days (5 years)
  },

  // Currency
  currency: process.env.COST_CURRENCY || 'USD',
  currencySymbol: process.env.COST_CURRENCY_SYMBOL || '$',
}));
