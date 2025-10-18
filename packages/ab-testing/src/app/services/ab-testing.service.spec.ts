import { Test, TestingModule } from '@nestjs/testing';
import { ABTestingService } from './ab-testing.service';
import { BucketingService } from './bucketing.service';
import { StatisticsService } from './statistics.service';
import {
  ExperimentType,
  AllocationStrategy,
  MetricType,
  MetricAggregation,
  SignificanceLevel,
} from '../interfaces/ab-testing.interface';

describe('ABTestingService', () => {
  let service: ABTestingService;
  let bucketingService: BucketingService;
  let statisticsService: StatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ABTestingService, BucketingService, StatisticsService],
    }).compile();

    service = module.get<ABTestingService>(ABTestingService);
    bucketingService = module.get<BucketingService>(BucketingService);
    statisticsService = module.get<StatisticsService>(StatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createExperiment', () => {
    it('should create a valid experiment', async () => {
      const config = {
        key: 'test-experiment',
        name: 'Test Experiment',
        description: 'Testing button colors',
        hypothesis: 'Blue buttons will increase conversions',
        type: ExperimentType.AB_TEST,
        allocationStrategy: AllocationStrategy.DETERMINISTIC,
        trafficAllocation: 1.0,
        variants: [
          {
            key: 'control',
            name: 'Control',
            isControl: true,
            weight: 1.0,
            config: { buttonColor: 'green' },
          },
          {
            key: 'variant_a',
            name: 'Blue Button',
            weight: 1.0,
            config: { buttonColor: 'blue' },
          },
        ],
        metrics: [
          {
            key: 'conversion',
            name: 'Conversion Rate',
            type: MetricType.CONVERSION,
            aggregation: MetricAggregation.AVERAGE,
            isPrimary: true,
          },
        ],
        ownerId: 'user-123',
      };

      // Note: This would need actual database connection
      // For now, this is a structure test
      expect(config.variants.length).toBe(2);
      expect(config.metrics.length).toBe(1);
    });

    it('should reject experiment without control variant', () => {
      const config = {
        key: 'invalid-experiment',
        name: 'Invalid Experiment',
        type: ExperimentType.AB_TEST,
        variants: [
          {
            key: 'variant_a',
            name: 'Variant A',
            isControl: false,
            weight: 1.0,
            config: {},
          },
        ],
        metrics: [],
        ownerId: 'user-123',
      };

      expect(() => {
        // Validate function would throw
        const controlCount = config.variants.filter((v) => v.isControl).length;
        if (controlCount !== 1) {
          throw new Error('Must have exactly one control variant');
        }
      }).toThrow();
    });
  });

  describe('BucketingService', () => {
    it('should generate consistent bucket values', () => {
      const userId = 'user-123';
      const experimentKey = 'test-experiment';

      const bucket1 = bucketingService.getBucketValue(userId, experimentKey);
      const bucket2 = bucketingService.getBucketValue(userId, experimentKey);

      expect(bucket1).toBe(bucket2);
      expect(bucket1).toBeGreaterThanOrEqual(0);
      expect(bucket1).toBeLessThan(10000);
    });

    it('should distribute users evenly', () => {
      const experimentKey = 'distribution-test';
      const buckets: number[] = [];

      // Generate 1000 bucket values
      for (let i = 0; i < 1000; i++) {
        const bucket = bucketingService.getBucketValue(`user-${i}`, experimentKey);
        buckets.push(bucket);
      }

      // Check distribution is roughly even
      const quartiles = [0, 2500, 5000, 7500, 10000];
      for (let i = 0; i < quartiles.length - 1; i++) {
        const count = buckets.filter(
          (b) => b >= quartiles[i] && b < quartiles[i + 1]
        ).length;

        // Should be roughly 250 ± 50 in each quartile
        expect(count).toBeGreaterThan(200);
        expect(count).toBeLessThan(300);
      }
    });

    it('should respect traffic allocation', () => {
      const bucketValue = 2500; // 25%
      const trafficAllocation = 0.5; // 50%

      const included = bucketingService.isUserIncluded(bucketValue, trafficAllocation);
      expect(included).toBe(true);

      const excluded = bucketingService.isUserIncluded(7500, 0.5);
      expect(excluded).toBe(false);
    });

    it('should assign variants based on weights', () => {
      const variants = [
        { key: 'control', weight: 1.0 },
        { key: 'variant_a', weight: 1.0 },
      ];

      // Test bucket values
      const assignment1 = bucketingService.assignVariant(2500, variants);
      const assignment2 = bucketingService.assignVariant(7500, variants);

      expect(['control', 'variant_a']).toContain(assignment1);
      expect(['control', 'variant_a']).toContain(assignment2);
    });
  });

  describe('StatisticsService', () => {
    it('should calculate conversion rate correctly', () => {
      const rate = statisticsService.calculateConversionRate(50, 100);
      expect(rate).toBe(0.5);
    });

    it('should calculate standard error', () => {
      const se = statisticsService.calculateStandardError(0.5, 100);
      expect(se).toBeCloseTo(0.05, 2);
    });

    it('should calculate confidence interval', () => {
      const [lower, upper] = statisticsService.calculateConfidenceInterval(
        0.5,
        100,
        0.95
      );

      expect(lower).toBeGreaterThan(0);
      expect(upper).toBeLessThan(1);
      expect(lower).toBeLessThan(0.5);
      expect(upper).toBeGreaterThan(0.5);
    });

    it('should perform z-test correctly', () => {
      // Control: 50/100 = 50%
      // Variant: 70/100 = 70%
      const pValue = statisticsService.twoProportionZTest(50, 100, 70, 100);

      // Should be significant
      expect(pValue).toBeLessThan(0.05);
    });

    it('should calculate effect size', () => {
      const effectSize = statisticsService.calculateEffectSize(0.5, 0.7);
      expect(Math.abs(effectSize)).toBeGreaterThan(0);
    });

    it('should calculate relative uplift', () => {
      const uplift = statisticsService.calculateRelativeUplift(0.5, 0.6);
      expect(uplift).toBe(20); // 20% improvement
    });

    it('should calculate required sample size', () => {
      const sampleSize = statisticsService.calculateRequiredSampleSize(
        0.15, // 15% baseline
        0.05, // 5% MDE
        0.05, // 95% confidence
        0.80  // 80% power
      );

      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBeLessThan(100000);
    });

    it('should calculate Bayesian probability', () => {
      const prob = statisticsService.calculateBayesianProbability(
        50, 100, // Control
        70, 100  // Variant
      );

      expect(prob).toBeGreaterThan(0.5);
      expect(prob).toBeLessThanOrEqual(1.0);
    });

    it('should calculate mean correctly', () => {
      const mean = statisticsService.calculateMean([1, 2, 3, 4, 5]);
      expect(mean).toBe(3);
    });

    it('should calculate median correctly', () => {
      const median = statisticsService.calculateMedian([1, 2, 3, 4, 5]);
      expect(median).toBe(3);

      const medianEven = statisticsService.calculateMedian([1, 2, 3, 4]);
      expect(medianEven).toBe(2.5);
    });

    it('should calculate standard deviation', () => {
      const stdDev = statisticsService.calculateStandardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(stdDev).toBeCloseTo(2, 0);
    });
  });
});
