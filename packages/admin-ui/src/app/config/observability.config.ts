/**
 * Observability Configuration
 *
 * Centralized configuration for observability and monitoring features
 * in the ORION admin-ui service.
 */

export interface ObservabilityConfig {
  /**
   * Cache TTL settings (in seconds)
   */
  cache: {
    healthTtl: number;
    metricsTtl: number;
    statsTtl: number;
    servicesListTtl: number;
  };

  /**
   * Health monitoring settings
   */
  healthMonitor: {
    enabled: boolean;
    intervalMs: number;
    startupDelayMs: number;
  };

  /**
   * HTTP request settings
   */
  http: {
    timeoutMs: number;
    retries: number;
  };

  /**
   * Event storage settings
   */
  events: {
    maxEventsInMemory: number;
    defaultLimit: number;
    maxLimit: number;
  };

  /**
   * Metrics settings
   */
  metrics: {
    defaultTimeRangeMinutes: number;
    maxTimeRangeMinutes: number;
  };
}

/**
 * Get observability configuration from environment variables with sensible defaults
 */
export function getObservabilityConfig(): ObservabilityConfig {
  return {
    cache: {
      healthTtl: parseInt(process.env['OBSERVABILITY_CACHE_HEALTH_TTL'] || '30', 10),
      metricsTtl: parseInt(process.env['OBSERVABILITY_CACHE_METRICS_TTL'] || '60', 10),
      statsTtl: parseInt(process.env['OBSERVABILITY_CACHE_STATS_TTL'] || '60', 10),
      servicesListTtl: parseInt(
        process.env['OBSERVABILITY_CACHE_SERVICES_TTL'] || '30',
        10,
      ),
    },
    healthMonitor: {
      enabled: process.env['HEALTH_MONITOR_ENABLED'] !== 'false',
      intervalMs: parseInt(process.env['HEALTH_MONITOR_INTERVAL_MS'] || '30000', 10),
      startupDelayMs: parseInt(
        process.env['HEALTH_MONITOR_STARTUP_DELAY_MS'] || '10000',
        10,
      ),
    },
    http: {
      timeoutMs: parseInt(process.env['OBSERVABILITY_HTTP_TIMEOUT_MS'] || '5000', 10),
      retries: parseInt(process.env['OBSERVABILITY_HTTP_RETRIES'] || '0', 10),
    },
    events: {
      maxEventsInMemory: parseInt(
        process.env['OBSERVABILITY_MAX_EVENTS'] || '10000',
        10,
      ),
      defaultLimit: parseInt(process.env['OBSERVABILITY_EVENTS_DEFAULT_LIMIT'] || '100', 10),
      maxLimit: parseInt(process.env['OBSERVABILITY_EVENTS_MAX_LIMIT'] || '1000', 10),
    },
    metrics: {
      defaultTimeRangeMinutes: parseInt(
        process.env['OBSERVABILITY_METRICS_DEFAULT_RANGE'] || '60',
        10,
      ),
      maxTimeRangeMinutes: parseInt(
        process.env['OBSERVABILITY_METRICS_MAX_RANGE'] || '10080',
        10,
      ), // 1 week
    },
  };
}

/**
 * Validate observability configuration
 */
export function validateObservabilityConfig(config: ObservabilityConfig): void {
  // Validate cache TTLs
  if (config.cache.healthTtl < 1 || config.cache.healthTtl > 3600) {
    throw new Error('Health cache TTL must be between 1 and 3600 seconds');
  }
  if (config.cache.metricsTtl < 1 || config.cache.metricsTtl > 3600) {
    throw new Error('Metrics cache TTL must be between 1 and 3600 seconds');
  }

  // Validate health monitor settings
  if (config.healthMonitor.intervalMs < 5000) {
    throw new Error('Health monitor interval must be at least 5000ms');
  }
  if (config.healthMonitor.startupDelayMs < 0) {
    throw new Error('Health monitor startup delay must be non-negative');
  }

  // Validate HTTP settings
  if (config.http.timeoutMs < 1000 || config.http.timeoutMs > 30000) {
    throw new Error('HTTP timeout must be between 1000 and 30000ms');
  }
  if (config.http.retries < 0 || config.http.retries > 5) {
    throw new Error('HTTP retries must be between 0 and 5');
  }

  // Validate event settings
  if (config.events.maxEventsInMemory < 100) {
    throw new Error('Max events in memory must be at least 100');
  }
  if (config.events.defaultLimit > config.events.maxLimit) {
    throw new Error('Default limit cannot exceed max limit');
  }

  // Validate metrics settings
  if (config.metrics.defaultTimeRangeMinutes < 1) {
    throw new Error('Default time range must be at least 1 minute');
  }
  if (config.metrics.maxTimeRangeMinutes < config.metrics.defaultTimeRangeMinutes) {
    throw new Error('Max time range cannot be less than default time range');
  }
}

/**
 * Default observability configuration
 */
export const DEFAULT_OBSERVABILITY_CONFIG: ObservabilityConfig = {
  cache: {
    healthTtl: 30, // 30 seconds
    metricsTtl: 60, // 1 minute
    statsTtl: 60, // 1 minute
    servicesListTtl: 30, // 30 seconds
  },
  healthMonitor: {
    enabled: true,
    intervalMs: 30000, // 30 seconds
    startupDelayMs: 10000, // 10 seconds
  },
  http: {
    timeoutMs: 5000, // 5 seconds
    retries: 0, // No retries by default
  },
  events: {
    maxEventsInMemory: 10000,
    defaultLimit: 100,
    maxLimit: 1000,
  },
  metrics: {
    defaultTimeRangeMinutes: 60, // 1 hour
    maxTimeRangeMinutes: 10080, // 1 week
  },
};
