import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Circuit Breaker States
 */
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service is healthy again
}

/**
 * Circuit Breaker Configuration
 */
interface CircuitConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes before closing from half-open
  timeout: number; // Time to wait before attempting half-open (ms)
  volumeThreshold: number; // Minimum number of requests before calculating failure rate
}

/**
 * Circuit Breaker Statistics
 */
interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastStateChange: number;
  totalRequests: number;
}

/**
 * Circuit Breaker Service
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when backend services are unavailable or experiencing issues.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests fail fast without calling the service
 * - HALF_OPEN: Testing recovery, limited requests pass through
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitStats>();
  private readonly configs = new Map<string, CircuitConfig>();

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default circuit configurations for each service
   */
  private initializeDefaultConfigs(): void {
    const defaultConfig: CircuitConfig = {
      failureThreshold: this.configService.get<number>(
        'gateway.circuitBreaker.failureThreshold',
        5
      ),
      successThreshold: this.configService.get<number>(
        'gateway.circuitBreaker.successThreshold',
        2
      ),
      timeout: this.configService.get<number>(
        'gateway.circuitBreaker.timeout',
        60000
      ),
      volumeThreshold: this.configService.get<number>(
        'gateway.circuitBreaker.volumeThreshold',
        10
      ),
    };

    // Initialize configs for each service
    ['auth', 'user', 'notification'].forEach((service) => {
      this.configs.set(service, { ...defaultConfig });
      this.circuits.set(service, this.createInitialStats());
    });
  }

  /**
   * Create initial circuit statistics
   */
  private createInitialStats(): CircuitStats {
    return {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastStateChange: Date.now(),
      totalRequests: 0,
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const stats = this.getCircuitStats(serviceName);
    const config = this.getCircuitConfig(serviceName);

    // Check if circuit is open
    if (stats.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(stats, config)) {
        this.transition(serviceName, CircuitState.HALF_OPEN);
      } else {
        throw new Error(
          `Circuit breaker is OPEN for service: ${serviceName}`
        );
      }
    }

    stats.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName, error);
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  private onSuccess(serviceName: string): void {
    const stats = this.getCircuitStats(serviceName);
    const config = this.getCircuitConfig(serviceName);

    stats.successes++;
    stats.consecutiveSuccesses++;
    stats.consecutiveFailures = 0;

    // If in HALF_OPEN state, check if we should close the circuit
    if (stats.state === CircuitState.HALF_OPEN) {
      if (stats.consecutiveSuccesses >= config.successThreshold) {
        this.transition(serviceName, CircuitState.CLOSED);
        this.logger.log(
          `Circuit CLOSED for service: ${serviceName} after ${stats.consecutiveSuccesses} successful requests`
        );
      }
    }
  }

  /**
   * Record a failed request
   */
  private onFailure(serviceName: string, error: Error): void {
    const stats = this.getCircuitStats(serviceName);
    const config = this.getCircuitConfig(serviceName);

    stats.failures++;
    stats.consecutiveFailures++;
    stats.consecutiveSuccesses = 0;
    stats.lastFailureTime = Date.now();

    this.logger.warn(
      `Circuit breaker failure for ${serviceName}: ${error.message} (${stats.consecutiveFailures}/${config.failureThreshold})`
    );

    // Check if we should open the circuit
    if (
      stats.totalRequests >= config.volumeThreshold &&
      stats.consecutiveFailures >= config.failureThreshold
    ) {
      this.transition(serviceName, CircuitState.OPEN);
      this.logger.error(
        `Circuit OPENED for service: ${serviceName} after ${stats.consecutiveFailures} consecutive failures`
      );
    } else if (stats.state === CircuitState.HALF_OPEN) {
      // If in HALF_OPEN and still failing, go back to OPEN
      this.transition(serviceName, CircuitState.OPEN);
      this.logger.warn(
        `Circuit re-OPENED for service: ${serviceName} - still experiencing failures`
      );
    }
  }

  /**
   * Check if we should attempt to reset the circuit from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(
    stats: CircuitStats,
    config: CircuitConfig
  ): boolean {
    const timeSinceOpen = Date.now() - stats.lastStateChange;
    return timeSinceOpen >= config.timeout;
  }

  /**
   * Transition circuit to a new state
   */
  private transition(serviceName: string, newState: CircuitState): void {
    const stats = this.getCircuitStats(serviceName);
    const oldState = stats.state;

    stats.state = newState;
    stats.lastStateChange = Date.now();

    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      stats.consecutiveFailures = 0;
      stats.consecutiveSuccesses = 0;
      stats.failures = 0;
      stats.successes = 0;
      stats.totalRequests = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      stats.consecutiveSuccesses = 0;
    }

    this.logger.log(
      `Circuit state transition for ${serviceName}: ${oldState} -> ${newState}`
    );
  }

  /**
   * Get circuit statistics for a service
   */
  private getCircuitStats(serviceName: string): CircuitStats {
    let stats = this.circuits.get(serviceName);
    if (!stats) {
      stats = this.createInitialStats();
      this.circuits.set(serviceName, stats);
    }
    return stats;
  }

  /**
   * Get circuit configuration for a service
   */
  private getCircuitConfig(serviceName: string): CircuitConfig {
    let config = this.configs.get(serviceName);
    if (!config) {
      config = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        volumeThreshold: 10,
      };
      this.configs.set(serviceName, config);
    }
    return config;
  }

  /**
   * Get current state of a circuit
   */
  getState(serviceName: string): CircuitState {
    return this.getCircuitStats(serviceName).state;
  }

  /**
   * Check if circuit is open
   */
  isOpen(serviceName: string): boolean {
    return this.getState(serviceName) === CircuitState.OPEN;
  }

  /**
   * Get all circuit statistics (for monitoring)
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    this.circuits.forEach((value, key) => {
      stats[key] = { ...value };
    });
    return stats;
  }

  /**
   * Manually reset a circuit (for admin operations)
   */
  reset(serviceName: string): void {
    const stats = this.createInitialStats();
    this.circuits.set(serviceName, stats);
    this.logger.log(`Circuit manually reset for service: ${serviceName}`);
  }

  /**
   * Manually force a circuit to a specific state (for testing)
   */
  forceState(serviceName: string, state: CircuitState): void {
    const stats = this.getCircuitStats(serviceName);
    stats.state = state;
    stats.lastStateChange = Date.now();
    this.logger.warn(
      `Circuit manually forced to ${state} for service: ${serviceName}`
    );
  }
}
