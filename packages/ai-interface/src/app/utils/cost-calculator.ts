/**
 * Cost Calculator Utility
 *
 * Calculates the cost of AI requests based on model pricing.
 * Prices are in USD per 1K tokens.
 *
 * Updated: October 2025
 */

export interface ModelPricing {
  promptPrice: number; // per 1K tokens
  completionPrice: number; // per 1K tokens
}

// OpenAI Pricing (as of October 2025)
const OPENAI_PRICING: Record<string, ModelPricing> = {
  'gpt-4': {
    promptPrice: 0.03,
    completionPrice: 0.06,
  },
  'gpt-4-turbo': {
    promptPrice: 0.01,
    completionPrice: 0.03,
  },
  'gpt-4-turbo-preview': {
    promptPrice: 0.01,
    completionPrice: 0.03,
  },
  'gpt-3.5-turbo': {
    promptPrice: 0.0015,
    completionPrice: 0.002,
  },
  'gpt-3.5-turbo-16k': {
    promptPrice: 0.003,
    completionPrice: 0.004,
  },
  'text-embedding-ada-002': {
    promptPrice: 0.0001,
    completionPrice: 0,
  },
  'text-embedding-3-small': {
    promptPrice: 0.00002,
    completionPrice: 0,
  },
  'text-embedding-3-large': {
    promptPrice: 0.00013,
    completionPrice: 0,
  },
};

// Anthropic Pricing (as of October 2025)
const ANTHROPIC_PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-20241022': {
    promptPrice: 0.003,
    completionPrice: 0.015,
  },
  'claude-3-opus-20240229': {
    promptPrice: 0.015,
    completionPrice: 0.075,
  },
  'claude-3-sonnet-20240229': {
    promptPrice: 0.003,
    completionPrice: 0.015,
  },
  'claude-3-haiku-20240307': {
    promptPrice: 0.00025,
    completionPrice: 0.00125,
  },
};

export class CostCalculator {
  /**
   * Calculate cost for OpenAI request
   */
  static calculateOpenAICost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing = OPENAI_PRICING[model] || OPENAI_PRICING['gpt-3.5-turbo'];

    const promptCost = (promptTokens / 1000) * pricing.promptPrice;
    const completionCost = (completionTokens / 1000) * pricing.completionPrice;

    return parseFloat((promptCost + completionCost).toFixed(6));
  }

  /**
   * Calculate cost for Anthropic request
   */
  static calculateAnthropicCost(
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    const pricing =
      ANTHROPIC_PRICING[model] || ANTHROPIC_PRICING['claude-3-5-sonnet-20241022'];

    const promptCost = (promptTokens / 1000) * pricing.promptPrice;
    const completionCost = (completionTokens / 1000) * pricing.completionPrice;

    return parseFloat((promptCost + completionCost).toFixed(6));
  }

  /**
   * Calculate cost based on provider
   */
  static calculateCost(
    provider: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    switch (provider.toLowerCase()) {
      case 'openai':
        return this.calculateOpenAICost(model, promptTokens, completionTokens);
      case 'anthropic':
        return this.calculateAnthropicCost(model, promptTokens, completionTokens);
      default:
        // Default to OpenAI pricing
        return this.calculateOpenAICost(model, promptTokens, completionTokens);
    }
  }

  /**
   * Get pricing info for a model
   */
  static getPricing(provider: string, model: string): ModelPricing | null {
    switch (provider.toLowerCase()) {
      case 'openai':
        return OPENAI_PRICING[model] || null;
      case 'anthropic':
        return ANTHROPIC_PRICING[model] || null;
      default:
        return null;
    }
  }

  /**
   * Estimate cost for a request before sending
   */
  static estimateCost(
    provider: string,
    model: string,
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number,
  ): number {
    return this.calculateCost(
      provider,
      model,
      estimatedPromptTokens,
      estimatedCompletionTokens,
    );
  }
}
