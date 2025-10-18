import { Test, TestingModule } from '@nestjs/testing';
import { FlagEvaluationService } from '../app/services/flag-evaluation.service';
import { FlagType, TargetType } from '../app/interfaces/feature-flag.interface';

describe('FlagEvaluationService', () => {
  let service: FlagEvaluationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FlagEvaluationService],
    }).compile();

    service = module.get<FlagEvaluationService>(FlagEvaluationService);
  });

  describe('evaluate - basic flags', () => {
    it('should return disabled if flag is globally disabled', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: false,
        rolloutPercentage: 100,
      };

      const result = service.evaluate(flag, {});

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Flag is globally disabled');
    });

    it('should return enabled for 100% rollout', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 100,
        targets: [],
      };

      const result = service.evaluate(flag, { userId: 'user-123' });

      expect(result.enabled).toBe(true);
    });

    it('should return disabled for 0% rollout', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 0,
        targets: [],
      };

      const result = service.evaluate(flag, { userId: 'user-123' });

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Zero rollout (0%)');
    });
  });

  describe('evaluate - targeting', () => {
    it('should match user target', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 0,
        targets: [
          {
            targetType: TargetType.USER,
            targetValue: 'user-123',
            enabled: true,
            priority: 10,
          },
        ],
      };

      const result = service.evaluate(flag, { userId: 'user-123' });

      expect(result.enabled).toBe(true);
      expect(result.reason).toContain('Matched target: USER=user-123');
    });

    it('should match role target', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 0,
        targets: [
          {
            targetType: TargetType.ROLE,
            targetValue: 'admin',
            enabled: true,
            priority: 10,
          },
        ],
      };

      const result = service.evaluate(flag, {
        userId: 'user-123',
        userRoles: ['admin', 'developer'],
      });

      expect(result.enabled).toBe(true);
    });

    it('should match email target', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 0,
        targets: [
          {
            targetType: TargetType.EMAIL,
            targetValue: 'user@example.com',
            enabled: true,
            priority: 10,
          },
        ],
      };

      const result = service.evaluate(flag, {
        userId: 'user-123',
        userEmail: 'user@example.com',
      });

      expect(result.enabled).toBe(true);
    });

    it('should respect target priority', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 0,
        targets: [
          {
            targetType: TargetType.USER,
            targetValue: 'user-123',
            enabled: false,
            priority: 5,
          },
          {
            targetType: TargetType.ROLE,
            targetValue: 'admin',
            enabled: true,
            priority: 10, // Higher priority
          },
        ],
      };

      const result = service.evaluate(flag, {
        userId: 'user-123',
        userRoles: ['admin'],
      });

      // Higher priority target should win
      expect(result.enabled).toBe(true);
    });
  });

  describe('evaluate - multivariate', () => {
    it('should return a variant for multivariate flag', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.MULTIVARIATE,
        rolloutPercentage: 100,
        targets: [],
        variants: [
          {
            key: 'variant-a',
            name: 'Variant A',
            value: '{"theme": "blue"}',
            weight: 50,
          },
          {
            key: 'variant-b',
            name: 'Variant B',
            value: '{"theme": "green"}',
            weight: 50,
          },
        ],
      };

      const result = service.evaluate(flag, { userId: 'user-123' });

      expect(result.enabled).toBe(true);
      expect(result.variant).toBeDefined();
      expect(['variant-a', 'variant-b']).toContain(result.variant);
    });

    it('should consistently assign same variant to same user', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.MULTIVARIATE,
        rolloutPercentage: 100,
        targets: [],
        variants: [
          {
            key: 'variant-a',
            value: '{"theme": "blue"}',
            weight: 50,
          },
          {
            key: 'variant-b',
            value: '{"theme": "green"}',
            weight: 50,
          },
        ],
      };

      const result1 = service.evaluate(flag, { userId: 'user-123' });
      const result2 = service.evaluate(flag, { userId: 'user-123' });

      expect(result1.variant).toBe(result2.variant);
    });
  });

  describe('evaluate - rollout percentage', () => {
    it('should use consistent hashing for rollout', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 50,
        targets: [],
      };

      // Same user should get consistent result
      const result1 = service.evaluate(flag, { userId: 'user-123' });
      const result2 = service.evaluate(flag, { userId: 'user-123' });

      expect(result1.enabled).toBe(result2.enabled);
    });

    it('should distribute users across rollout percentage', () => {
      const flag: any = {
        id: '1',
        key: 'test-flag',
        enabled: true,
        type: FlagType.BOOLEAN,
        rolloutPercentage: 50,
        targets: [],
      };

      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = service.evaluate(flag, { userId: `user-${i}` });
        results.push(result.enabled);
      }

      const enabledCount = results.filter((r) => r).length;

      // Should be roughly 50% (allow 20% variance for small sample)
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });
  });
});
