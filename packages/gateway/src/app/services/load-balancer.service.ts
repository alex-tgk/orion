import { Injectable, Logger } from '@nestjs/common';
import { ServiceInstance } from './service-discovery.service';

/**
 * Load Balancing Strategy
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
  RANDOM = 'RANDOM',
  WEIGHTED_ROUND_ROBIN = 'WEIGHTED_ROUND_ROBIN',
}

/**
 * Instance Metrics for load balancing
 */
interface InstanceMetrics {
  activeConnections: number;
  totalRequests: number;
  weight: number;
}

/**
 * Load Balancer Service
 *
 * Implements various load balancing strategies for distributing
 * requests across multiple service instances.
 *
 * Supported Strategies:
 * - Round Robin: Distributes requests evenly in sequential order
 * - Least Connections: Routes to instance with fewest active connections
 * - Random: Randomly selects an instance
 * - Weighted Round Robin: Distributes based on instance weights
 */
@Injectable()
export class LoadBalancerService {
  private readonly logger = new Logger(LoadBalancerService.name);
  private readonly roundRobinCounters = new Map<string, number>();
  private readonly instanceMetrics = new Map<string, InstanceMetrics>();
  private strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN;

  /**
   * Set the load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.logger.log(`Load balancing strategy set to: ${strategy}`);
  }

  /**
   * Get the current load balancing strategy
   */
  getStrategy(): LoadBalancingStrategy {
    return this.strategy;
  }

  /**
   * Select an instance using the configured strategy
   */
  selectInstance(
    serviceName: string,
    instances: ServiceInstance[]
  ): ServiceInstance | null {
    if (instances.length === 0) {
      return null;
    }

    if (instances.length === 1) {
      return instances[0];
    }

    switch (this.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.roundRobin(serviceName, instances);

      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.leastConnections(instances);

      case LoadBalancingStrategy.RANDOM:
        return this.random(instances);

      case LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobin(serviceName, instances);

      default:
        return this.roundRobin(serviceName, instances);
    }
  }

  /**
   * Round Robin: Select instances in sequential order
   */
  private roundRobin(
    serviceName: string,
    instances: ServiceInstance[]
  ): ServiceInstance {
    let counter = this.roundRobinCounters.get(serviceName) || 0;
    const instance = instances[counter % instances.length];

    counter = (counter + 1) % instances.length;
    this.roundRobinCounters.set(serviceName, counter);

    return instance;
  }

  /**
   * Least Connections: Select instance with fewest active connections
   */
  private leastConnections(instances: ServiceInstance[]): ServiceInstance {
    let selectedInstance = instances[0];
    let minConnections = this.getInstanceMetrics(instances[0].id)
      .activeConnections;

    for (const instance of instances) {
      const connections = this.getInstanceMetrics(instance.id)
        .activeConnections;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }

    return selectedInstance;
  }

  /**
   * Random: Randomly select an instance
   */
  private random(instances: ServiceInstance[]): ServiceInstance {
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  /**
   * Weighted Round Robin: Select based on instance weights
   */
  private weightedRoundRobin(
    serviceName: string,
    instances: ServiceInstance[]
  ): ServiceInstance {
    // Calculate total weight
    const totalWeight = instances.reduce((sum, instance) => {
      return sum + this.getInstanceMetrics(instance.id).weight;
    }, 0);

    if (totalWeight === 0) {
      return this.roundRobin(serviceName, instances);
    }

    // Get or initialize counter
    let counter = this.roundRobinCounters.get(serviceName) || 0;
    counter = counter % totalWeight;

    // Find the instance based on weight distribution
    let cumulativeWeight = 0;
    for (const instance of instances) {
      const weight = this.getInstanceMetrics(instance.id).weight;
      cumulativeWeight += weight;

      if (counter < cumulativeWeight) {
        this.roundRobinCounters.set(
          serviceName,
          (counter + 1) % totalWeight
        );
        return instance;
      }
    }

    // Fallback to first instance
    return instances[0];
  }

  /**
   * Get or create metrics for an instance
   */
  private getInstanceMetrics(instanceId: string): InstanceMetrics {
    let metrics = this.instanceMetrics.get(instanceId);
    if (!metrics) {
      metrics = {
        activeConnections: 0,
        totalRequests: 0,
        weight: 1, // Default weight
      };
      this.instanceMetrics.set(instanceId, metrics);
    }
    return metrics;
  }

  /**
   * Increment active connections for an instance
   */
  incrementConnections(instanceId: string): void {
    const metrics = this.getInstanceMetrics(instanceId);
    metrics.activeConnections++;
    metrics.totalRequests++;
  }

  /**
   * Decrement active connections for an instance
   */
  decrementConnections(instanceId: string): void {
    const metrics = this.getInstanceMetrics(instanceId);
    if (metrics.activeConnections > 0) {
      metrics.activeConnections--;
    }
  }

  /**
   * Set weight for an instance (for weighted load balancing)
   */
  setInstanceWeight(instanceId: string, weight: number): void {
    const metrics = this.getInstanceMetrics(instanceId);
    metrics.weight = Math.max(0, weight);
    this.logger.log(`Set weight for instance ${instanceId}: ${weight}`);
  }

  /**
   * Get all instance metrics
   */
  getAllMetrics(): Map<string, InstanceMetrics> {
    return new Map(this.instanceMetrics);
  }

  /**
   * Reset metrics for an instance
   */
  resetMetrics(instanceId: string): void {
    this.instanceMetrics.delete(instanceId);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.instanceMetrics.clear();
    this.roundRobinCounters.clear();
  }
}
