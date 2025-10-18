import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriod } from '../dto/analytics.dto';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackQuery', () => {
    it('should track a successful query', async () => {
      const params = {
        query: 'test query',
        userId: 'user123',
        resultsCount: 10,
        executionTime: 125,
        filters: { entityType: 'Document' },
      };

      await service.trackQuery(params);

      // Verify tracking doesn't throw
      expect(true).toBe(true);
    });

    it('should track a zero-result query', async () => {
      const params = {
        query: 'nonexistent query',
        resultsCount: 0,
        executionTime: 50,
      };

      await service.trackQuery(params);

      expect(true).toBe(true);
    });
  });

  describe('calculateDateRange', () => {
    it('should calculate hourly range', () => {
      const result = service['calculateDateRange'](AnalyticsPeriod.HOUR);

      const hourDiff =
        (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60);
      expect(hourDiff).toBeCloseTo(1, 0);
    });

    it('should calculate daily range', () => {
      const result = service['calculateDateRange'](AnalyticsPeriod.DAY);

      const dayDiff =
        (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(dayDiff).toBeCloseTo(1, 0);
    });

    it('should calculate weekly range', () => {
      const result = service['calculateDateRange'](AnalyticsPeriod.WEEK);

      const dayDiff =
        (result.end.getTime() - result.start.getTime()) / (1000 * 60 * 60 * 24);
      expect(dayDiff).toBeCloseTo(7, 0);
    });

    it('should use custom date range', () => {
      const startDate = '2025-10-01T00:00:00Z';
      const endDate = '2025-10-18T00:00:00Z';

      const result = service['calculateDateRange'](
        AnalyticsPeriod.DAY,
        startDate,
        endDate,
      );

      expect(result.start.toISOString()).toBe(startDate);
      expect(result.end.toISOString()).toBe(endDate);
    });
  });

  describe('calculateEntityTypeDistribution', () => {
    it('should calculate distribution correctly', () => {
      const queries = [
        { entityType: 'Document' },
        { entityType: 'Document' },
        { entityType: 'User' },
        { entityType: 'File' },
        { entityType: 'Document' },
      ];

      const result = service['calculateEntityTypeDistribution'](queries);

      expect(result['Document']).toBe(3);
      expect(result['User']).toBe(1);
      expect(result['File']).toBe(1);
    });

    it('should handle queries without entityType', () => {
      const queries = [{ entityType: 'Document' }, {}, { entityType: 'User' }];

      const result = service['calculateEntityTypeDistribution'](queries);

      expect(result['Document']).toBe(1);
      expect(result['User']).toBe(1);
      expect(Object.keys(result)).toHaveLength(2);
    });
  });

  describe('calculateHourlyDistribution', () => {
    it('should calculate hourly distribution', () => {
      const now = new Date();
      const queries = [
        { timestamp: new Date(now.setHours(10, 0, 0)) },
        { timestamp: new Date(now.setHours(10, 30, 0)) },
        { timestamp: new Date(now.setHours(14, 0, 0)) },
      ];

      const result = service['calculateHourlyDistribution'](queries);

      expect(result['10']).toBe(2);
      expect(result['14']).toBe(1);
    });
  });
});
