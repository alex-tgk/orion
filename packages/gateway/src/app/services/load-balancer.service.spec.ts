import { Test, TestingModule } from '@nestjs/testing';
import { LoadBalancerService, LoadBalancingStrategy } from './load-balancer.service';
import { ServiceInstance } from './service-discovery.service';

describe('LoadBalancerService', () => {
  let service: LoadBalancerService;

  const createMockInstances = (count: number): ServiceInstance[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `instance-${i}`,
      name: 'test-service',
      host: `host-${i}`,
      port: 3000 + i,
      url: `http://host-${i}:${3000 + i}`,
      healthy: true,
      lastHealthCheck: new Date(),
      metadata: {},
    }));
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoadBalancerService],
    }).compile();

    service = module.get<LoadBalancerService>(LoadBalancerService);
  });

  afterEach(() => {
    service.resetAllMetrics();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should default to ROUND_ROBIN strategy', () => {
      expect(service.getStrategy()).toBe(LoadBalancingStrategy.ROUND_ROBIN);
    });
  });

  describe('setStrategy', () => {
    it('should set load balancing strategy', () => {
      // Act
      service.setStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);

      // Assert
      expect(service.getStrategy()).toBe(LoadBalancingStrategy.LEAST_CONNECTIONS);
    });

    it('should change strategy multiple times', () => {
      // Act & Assert
      service.setStrategy(LoadBalancingStrategy.RANDOM);
      expect(service.getStrategy()).toBe(LoadBalancingStrategy.RANDOM);

      service.setStrategy(LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN);
      expect(service.getStrategy()).toBe(LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN);
    });
  });

  describe('selectInstance', () => {
    it('should return null for empty instances', () => {
      // Arrange
      const instances: ServiceInstance[] = [];

      // Act
      const selected = service.selectInstance('test-service', instances);

      // Assert
      expect(selected).toBeNull();
    });

    it('should return single instance when only one available', () => {
      // Arrange
      const instances = createMockInstances(1);

      // Act
      const selected = service.selectInstance('test-service', instances);

      // Assert
      expect(selected).toBe(instances[0]);
    });
  });

  describe('Round Robin Strategy', () => {
    it('should distribute requests evenly', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.ROUND_ROBIN);
      const instances = createMockInstances(3);
      const selections: ServiceInstance[] = [];

      // Act - Select 6 instances (2 full rounds)
      for (let i = 0; i < 6; i++) {
        const selected = service.selectInstance('test-service', instances);
        selections.push(selected!);
      }

      // Assert
      expect(selections[0]).toBe(instances[0]);
      expect(selections[1]).toBe(instances[1]);
      expect(selections[2]).toBe(instances[2]);
      expect(selections[3]).toBe(instances[0]); // Second round
      expect(selections[4]).toBe(instances[1]);
      expect(selections[5]).toBe(instances[2]);
    });

    it('should maintain separate counters for different services', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.ROUND_ROBIN);
      const instances = createMockInstances(3);

      // Act
      const service1_first = service.selectInstance('service-1', instances);
      const service2_first = service.selectInstance('service-2', instances);
      const service1_second = service.selectInstance('service-1', instances);

      // Assert
      expect(service1_first).toBe(instances[0]);
      expect(service2_first).toBe(instances[0]); // Different service, starts at 0
      expect(service1_second).toBe(instances[1]); // Service-1 moves to next
    });
  });

  describe('Least Connections Strategy', () => {
    it('should select instance with fewest connections', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);
      const instances = createMockInstances(3);

      service.incrementConnections(instances[0].id);
      service.incrementConnections(instances[0].id);
      service.incrementConnections(instances[1].id);
      // instances[2] has 0 connections

      // Act
      const selected = service.selectInstance('test-service', instances);

      // Assert
      expect(selected).toBe(instances[2]);
    });

    it('should balance connections as they are decremented', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);
      const instances = createMockInstances(2);

      service.incrementConnections(instances[0].id);
      service.incrementConnections(instances[1].id);
      service.incrementConnections(instances[1].id);

      // Act - Before decrement
      let selected = service.selectInstance('test-service', instances);
      expect(selected).toBe(instances[0]); // Has 1 connection vs 2

      // Decrement instance[1]
      service.decrementConnections(instances[1].id);

      // Act - After decrement
      selected = service.selectInstance('test-service', instances);
      // Now both have 1 connection, should select first
      expect(selected).toBe(instances[0]);
    });

    it('should handle zero connections gracefully', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);
      const instances = createMockInstances(2);

      service.incrementConnections(instances[0].id);
      service.decrementConnections(instances[0].id);
      service.decrementConnections(instances[0].id); // Over-decrement

      // Act
      const selected = service.selectInstance('test-service', instances);

      // Assert
      expect(selected).toBeDefined();
    });
  });

  describe('Random Strategy', () => {
    it('should select random instances', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.RANDOM);
      const instances = createMockInstances(5);
      const selections = new Set<ServiceInstance>();

      // Act - Select multiple times
      for (let i = 0; i < 20; i++) {
        const selected = service.selectInstance('test-service', instances);
        selections.add(selected!);
      }

      // Assert - Should have selected at least 2 different instances (probabilistic)
      expect(selections.size).toBeGreaterThanOrEqual(2);
    });

    it('should select from all available instances', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.RANDOM);
      const instances = createMockInstances(3);

      // Act
      const selected = service.selectInstance('test-service', instances);

      // Assert
      expect(instances).toContain(selected);
    });
  });

  describe('Weighted Round Robin Strategy', () => {
    it('should distribute based on weights', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN);
      const instances = createMockInstances(3);

      // Set weights: instance-0 = 3, instance-1 = 2, instance-2 = 1
      service.setInstanceWeight(instances[0].id, 3);
      service.setInstanceWeight(instances[1].id, 2);
      service.setInstanceWeight(instances[2].id, 1);

      const selections: ServiceInstance[] = [];

      // Act - Select 6 times (total weight)
      for (let i = 0; i < 6; i++) {
        const selected = service.selectInstance('test-service', instances);
        selections.push(selected!);
      }

      // Assert - Count selections per instance
      const counts = {
        [instances[0].id]: 0,
        [instances[1].id]: 0,
        [instances[2].id]: 0,
      };

      selections.forEach(instance => counts[instance.id]++);

      expect(counts[instances[0].id]).toBe(3);
      expect(counts[instances[1].id]).toBe(2);
      expect(counts[instances[2].id]).toBe(1);
    });

    it('should fallback to round robin when all weights are zero', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN);
      const instances = createMockInstances(3);

      service.setInstanceWeight(instances[0].id, 0);
      service.setInstanceWeight(instances[1].id, 0);
      service.setInstanceWeight(instances[2].id, 0);

      // Act
      const first = service.selectInstance('test-service', instances);
      const second = service.selectInstance('test-service', instances);

      // Assert - Should behave like round robin
      expect(first).toBe(instances[0]);
      expect(second).toBe(instances[1]);
    });

    it('should handle negative weights', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN);
      const instances = createMockInstances(2);

      // Act - Set negative weight (should be converted to 0)
      service.setInstanceWeight(instances[0].id, -1);

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.get(instances[0].id)?.weight).toBe(0);
    });
  });

  describe('Connection Management', () => {
    it('should increment active connections', () => {
      // Arrange
      const instanceId = 'test-instance';

      // Act
      service.incrementConnections(instanceId);
      service.incrementConnections(instanceId);

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.get(instanceId)?.activeConnections).toBe(2);
      expect(metrics.get(instanceId)?.totalRequests).toBe(2);
    });

    it('should decrement active connections', () => {
      // Arrange
      const instanceId = 'test-instance';
      service.incrementConnections(instanceId);
      service.incrementConnections(instanceId);

      // Act
      service.decrementConnections(instanceId);

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.get(instanceId)?.activeConnections).toBe(1);
    });

    it('should not allow negative connections', () => {
      // Arrange
      const instanceId = 'test-instance';

      // Act
      service.decrementConnections(instanceId);
      service.decrementConnections(instanceId);

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.get(instanceId)?.activeConnections).toBe(0);
    });

    it('should track total requests independently of active connections', () => {
      // Arrange
      const instanceId = 'test-instance';

      // Act
      service.incrementConnections(instanceId);
      service.incrementConnections(instanceId);
      service.decrementConnections(instanceId);

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.get(instanceId)?.activeConnections).toBe(1);
      expect(metrics.get(instanceId)?.totalRequests).toBe(2);
    });
  });

  describe('Metrics Management', () => {
    it('should get all metrics', () => {
      // Arrange
      service.incrementConnections('instance-1');
      service.incrementConnections('instance-2');
      service.setInstanceWeight('instance-3', 5);

      // Act
      const metrics = service.getAllMetrics();

      // Assert
      expect(metrics.size).toBe(3);
      expect(metrics.get('instance-1')).toBeDefined();
      expect(metrics.get('instance-2')).toBeDefined();
      expect(metrics.get('instance-3')).toBeDefined();
    });

    it('should reset metrics for specific instance', () => {
      // Arrange
      service.incrementConnections('instance-1');
      service.incrementConnections('instance-2');

      // Act
      service.resetMetrics('instance-1');

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.has('instance-1')).toBe(false);
      expect(metrics.has('instance-2')).toBe(true);
    });

    it('should reset all metrics', () => {
      // Arrange
      service.incrementConnections('instance-1');
      service.incrementConnections('instance-2');
      service.setInstanceWeight('instance-3', 5);

      // Act
      service.resetAllMetrics();

      // Assert
      const metrics = service.getAllMetrics();
      expect(metrics.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid instance selection', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.ROUND_ROBIN);
      const instances = createMockInstances(3);

      // Act - Select 1000 instances rapidly
      const selections: ServiceInstance[] = [];
      for (let i = 0; i < 1000; i++) {
        selections.push(service.selectInstance('test-service', instances)!);
      }

      // Assert - Should distribute evenly
      const counts = {
        [instances[0].id]: 0,
        [instances[1].id]: 0,
        [instances[2].id]: 0,
      };

      selections.forEach(instance => counts[instance.id]++);

      expect(counts[instances[0].id]).toBeCloseTo(333, -1);
      expect(counts[instances[1].id]).toBeCloseTo(334, -1);
      expect(counts[instances[2].id]).toBeCloseTo(333, -1);
    });

    it('should handle strategy changes mid-operation', () => {
      // Arrange
      const instances = createMockInstances(3);

      // Act
      service.setStrategy(LoadBalancingStrategy.ROUND_ROBIN);
      const first = service.selectInstance('test-service', instances);

      service.setStrategy(LoadBalancingStrategy.RANDOM);
      const second = service.selectInstance('test-service', instances);

      service.setStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);
      const third = service.selectInstance('test-service', instances);

      // Assert - All selections should be valid
      expect(instances).toContain(first);
      expect(instances).toContain(second);
      expect(instances).toContain(third);
    });

    it('should handle instance list changes', () => {
      // Arrange
      service.setStrategy(LoadBalancingStrategy.ROUND_ROBIN);
      const instances = createMockInstances(3);

      // Act - Select with 3 instances
      service.selectInstance('test-service', instances);

      // Remove one instance
      const reducedInstances = instances.slice(0, 2);
      const selected = service.selectInstance('test-service', reducedInstances);

      // Assert
      expect(reducedInstances).toContain(selected);
    });
  });
});
