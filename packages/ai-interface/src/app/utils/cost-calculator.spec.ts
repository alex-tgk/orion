import { CostCalculator } from './cost-calculator';

describe('CostCalculator', () => {
  describe('calculateOpenAICost', () => {
    it('should calculate cost for GPT-4', () => {
      const cost = CostCalculator.calculateOpenAICost('gpt-4', 1000, 1000);
      expect(cost).toBe(0.09); // (1000/1000 * 0.03) + (1000/1000 * 0.06)
    });

    it('should calculate cost for GPT-3.5-turbo', () => {
      const cost = CostCalculator.calculateOpenAICost(
        'gpt-3.5-turbo',
        1000,
        1000,
      );
      expect(cost).toBe(0.0035); // (1000/1000 * 0.0015) + (1000/1000 * 0.002)
    });

    it('should calculate cost for text-embedding-ada-002', () => {
      const cost = CostCalculator.calculateOpenAICost(
        'text-embedding-ada-002',
        1000,
        0,
      );
      expect(cost).toBe(0.0001); // 1000/1000 * 0.0001
    });

    it('should handle unknown models with default pricing', () => {
      const cost = CostCalculator.calculateOpenAICost(
        'unknown-model',
        1000,
        1000,
      );
      expect(cost).toBeDefined();
      expect(typeof cost).toBe('number');
    });

    it('should handle zero tokens', () => {
      const cost = CostCalculator.calculateOpenAICost('gpt-4', 0, 0);
      expect(cost).toBe(0);
    });

    it('should round to 6 decimal places', () => {
      const cost = CostCalculator.calculateOpenAICost('gpt-4', 333, 333);
      expect(cost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });

  describe('calculateAnthropicCost', () => {
    it('should calculate cost for Claude 3.5 Sonnet', () => {
      const cost = CostCalculator.calculateAnthropicCost(
        'claude-3-5-sonnet-20241022',
        1000,
        1000,
      );
      expect(cost).toBe(0.018); // (1000/1000 * 0.003) + (1000/1000 * 0.015)
    });

    it('should calculate cost for Claude 3 Opus', () => {
      const cost = CostCalculator.calculateAnthropicCost(
        'claude-3-opus-20240229',
        1000,
        1000,
      );
      expect(cost).toBe(0.09); // (1000/1000 * 0.015) + (1000/1000 * 0.075)
    });

    it('should calculate cost for Claude 3 Haiku', () => {
      const cost = CostCalculator.calculateAnthropicCost(
        'claude-3-haiku-20240307',
        1000,
        1000,
      );
      expect(cost).toBe(0.00150); // (1000/1000 * 0.00025) + (1000/1000 * 0.00125)
    });
  });

  describe('calculateCost', () => {
    it('should route to OpenAI calculator', () => {
      const cost = CostCalculator.calculateCost('openai', 'gpt-4', 1000, 1000);
      expect(cost).toBe(0.09);
    });

    it('should route to Anthropic calculator', () => {
      const cost = CostCalculator.calculateCost(
        'anthropic',
        'claude-3-5-sonnet-20241022',
        1000,
        1000,
      );
      expect(cost).toBe(0.018);
    });

    it('should handle case insensitive provider names', () => {
      const cost1 = CostCalculator.calculateCost('OpenAI', 'gpt-4', 1000, 1000);
      const cost2 = CostCalculator.calculateCost('openai', 'gpt-4', 1000, 1000);
      expect(cost1).toBe(cost2);
    });

    it('should default to OpenAI for unknown providers', () => {
      const cost = CostCalculator.calculateCost(
        'unknown',
        'gpt-3.5-turbo',
        1000,
        1000,
      );
      expect(cost).toBeDefined();
      expect(typeof cost).toBe('number');
    });
  });

  describe('getPricing', () => {
    it('should return OpenAI pricing', () => {
      const pricing = CostCalculator.getPricing('openai', 'gpt-4');
      expect(pricing).toEqual({
        promptPrice: 0.03,
        completionPrice: 0.06,
      });
    });

    it('should return Anthropic pricing', () => {
      const pricing = CostCalculator.getPricing(
        'anthropic',
        'claude-3-5-sonnet-20241022',
      );
      expect(pricing).toEqual({
        promptPrice: 0.003,
        completionPrice: 0.015,
      });
    });

    it('should return null for unknown models', () => {
      const pricing = CostCalculator.getPricing('openai', 'unknown-model');
      expect(pricing).toBeNull();
    });

    it('should return null for unknown providers', () => {
      const pricing = CostCalculator.getPricing('unknown', 'gpt-4');
      expect(pricing).toBeNull();
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost same as calculate cost', () => {
      const estimated = CostCalculator.estimateCost(
        'openai',
        'gpt-4',
        1000,
        1000,
      );
      const calculated = CostCalculator.calculateCost(
        'openai',
        'gpt-4',
        1000,
        1000,
      );
      expect(estimated).toBe(calculated);
    });
  });
});
