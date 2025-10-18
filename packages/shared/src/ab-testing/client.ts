/**
 * A/B Testing Client SDK
 * Client-side SDK for interacting with the A/B Testing service
 */

export interface ABTestingConfig {
  apiUrl: string;
  apiKey?: string;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface VariantAssignment {
  experimentKey: string;
  variantKey: string;
  config: Record<string, any>;
  payload?: Record<string, any>;
  isOverride: boolean;
}

export interface UserContext {
  userId: string;
  deviceId?: string;
  sessionId?: string;
  attributes?: Record<string, any>;
}

export class ABTestingClient {
  private config: ABTestingConfig;
  private cache: Map<string, { assignment: VariantAssignment; timestamp: number }>;

  constructor(config: ABTestingConfig) {
    this.config = {
      timeout: 5000,
      cache: true,
      cacheTTL: 300000, // 5 minutes
      ...config,
    };
    this.cache = new Map();
  }

  /**
   * Get variant assignment for a user
   */
  async getVariant(
    experimentKey: string,
    context: UserContext
  ): Promise<VariantAssignment> {
    // Check cache
    if (this.config.cache) {
      const cached = this.getCachedAssignment(experimentKey, context.userId);
      if (cached) {
        return cached;
      }
    }

    // Make API request
    const url = new URL(
      `/api/v1/experiments/${experimentKey}/assignment`,
      this.config.apiUrl
    );

    const params = new URLSearchParams({
      userId: context.userId,
      ...(context.deviceId && { deviceId: context.deviceId }),
      ...(context.sessionId && { sessionId: context.sessionId }),
    });

    if (context.attributes) {
      params.append('attributes', JSON.stringify(context.attributes));
    }

    url.search = params.toString();

    const response = await this.fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to get variant: ${response.statusText}`);
    }

    const assignment: VariantAssignment = await response.json();

    // Cache assignment
    if (this.config.cache) {
      this.cacheAssignment(experimentKey, context.userId, assignment);
    }

    return assignment;
  }

  /**
   * Track a metric
   */
  async trackMetric(
    experimentKey: string,
    metricKey: string,
    value: number,
    userId: string,
    context?: Record<string, any>
  ): Promise<void> {
    const url = `${this.config.apiUrl}/api/v1/experiments/${experimentKey}/track`;

    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        metricKey,
        value,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to track metric: ${response.statusText}`);
    }
  }

  /**
   * Track a conversion
   */
  async trackConversion(
    experimentKey: string,
    userId: string,
    value?: number,
    context?: Record<string, any>
  ): Promise<void> {
    const url = `${this.config.apiUrl}/api/v1/experiments/${experimentKey}/conversion`;

    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        value,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to track conversion: ${response.statusText}`);
    }
  }

  /**
   * Check if user is in variant
   */
  async isInVariant(
    experimentKey: string,
    variantKey: string,
    context: UserContext
  ): Promise<boolean> {
    try {
      const assignment = await this.getVariant(experimentKey, context);
      return assignment.variantKey === variantKey;
    } catch (error) {
      console.error('Error checking variant:', error);
      return false;
    }
  }

  /**
   * Get variant config value
   */
  async getVariantConfig<T = any>(
    experimentKey: string,
    configKey: string,
    defaultValue: T,
    context: UserContext
  ): Promise<T> {
    try {
      const assignment = await this.getVariant(experimentKey, context);
      return assignment.config[configKey] ?? defaultValue;
    } catch (error) {
      console.error('Error getting variant config:', error);
      return defaultValue;
    }
  }

  /**
   * Clear cache
   */
  clearCache(experimentKey?: string): void {
    if (experimentKey) {
      // Clear specific experiment cache
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(experimentKey)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  private getCachedAssignment(
    experimentKey: string,
    userId: string
  ): VariantAssignment | null {
    const cacheKey = `${experimentKey}:${userId}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < (this.config.cacheTTL || 300000)) {
        return cached.assignment;
      }
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private cacheAssignment(
    experimentKey: string,
    userId: string,
    assignment: VariantAssignment
  ): void {
    const cacheKey = `${experimentKey}:${userId}`;
    this.cache.set(cacheKey, {
      assignment,
      timestamp: Date.now(),
    });
  }

  private async fetch(url: string, options?: RequestInit): Promise<Response> {
    const headers = {
      ...options?.headers,
      ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * React Hook for A/B Testing
 */
export function useABTest(experimentKey: string, client: ABTestingClient) {
  // This would be implemented with React hooks in a real scenario
  // For now, providing the interface
  return {
    variant: null,
    isLoading: true,
    error: null,
    trackConversion: async () => {},
    trackMetric: async (metricKey: string, value: number) => {},
  };
}

/**
 * Higher-order component for A/B Testing
 */
export function withABTest(experimentKey: string, client: ABTestingClient) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function ABTestWrapper(props: P) {
      // HOC implementation would go here
      return null;
    };
  };
}
