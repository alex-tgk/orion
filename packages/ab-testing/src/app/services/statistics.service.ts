import { Injectable } from '@nestjs/common';

/**
 * Statistics Service
 * Provides statistical analysis for A/B test results
 */
@Injectable()
export class StatisticsService {
  /**
   * Calculate conversion rate
   */
  calculateConversionRate(conversions: number, total: number): number {
    if (total === 0) return 0;
    return conversions / total;
  }

  /**
   * Calculate standard error for proportion
   */
  calculateStandardError(proportion: number, sampleSize: number): number {
    if (sampleSize === 0) return 0;
    return Math.sqrt((proportion * (1 - proportion)) / sampleSize);
  }

  /**
   * Calculate confidence interval for proportion
   * @param proportion - Sample proportion
   * @param sampleSize - Sample size
   * @param confidenceLevel - Confidence level (e.g., 0.95 for 95%)
   * @returns [lower bound, upper bound]
   */
  calculateConfidenceInterval(
    proportion: number,
    sampleSize: number,
    confidenceLevel: number = 0.95
  ): [number, number] {
    if (sampleSize === 0) return [0, 0];

    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
      0.999: 3.291,
    };

    const zScore = zScores[confidenceLevel] || 1.96;
    const standardError = this.calculateStandardError(proportion, sampleSize);
    const margin = zScore * standardError;

    return [
      Math.max(0, proportion - margin),
      Math.min(1, proportion + margin),
    ];
  }

  /**
   * Perform two-proportion z-test
   * Tests if two proportions are significantly different
   * @returns p-value
   */
  twoProportionZTest(
    conversions1: number,
    total1: number,
    conversions2: number,
    total2: number
  ): number {
    if (total1 === 0 || total2 === 0) return 1.0;

    const p1 = conversions1 / total1;
    const p2 = conversions2 / total2;

    // Pooled proportion
    const pooledP = (conversions1 + conversions2) / (total1 + total2);

    // Standard error
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / total1 + 1 / total2));

    if (se === 0) return 1.0;

    // Z-score
    const z = Math.abs(p1 - p2) / se;

    // Convert z-score to p-value (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(z));

    return pValue;
  }

  /**
   * Calculate effect size (Cohen's h for proportions)
   */
  calculateEffectSize(p1: number, p2: number): number {
    const phi1 = 2 * Math.asin(Math.sqrt(p1));
    const phi2 = 2 * Math.asin(Math.sqrt(p2));
    return phi1 - phi2;
  }

  /**
   * Calculate relative uplift
   */
  calculateRelativeUplift(control: number, variant: number): number {
    if (control === 0) return 0;
    return ((variant - control) / control) * 100;
  }

  /**
   * Calculate absolute uplift
   */
  calculateAbsoluteUplift(control: number, variant: number): number {
    return variant - control;
  }

  /**
   * Calculate statistical power
   * @param effectSize - Expected effect size
   * @param sampleSize - Sample size per group
   * @param alpha - Significance level (default 0.05)
   * @returns Statistical power (0-1)
   */
  calculatePower(
    effectSize: number,
    sampleSize: number,
    alpha: number = 0.05
  ): number {
    // Simplified power calculation
    // For more accurate results, would need to use non-central t-distribution
    const zAlpha = this.normalInverseCDF(1 - alpha / 2);
    const zBeta = Math.sqrt(sampleSize) * Math.abs(effectSize) - zAlpha;
    return this.normalCDF(zBeta);
  }

  /**
   * Calculate required sample size
   * @param baseline - Baseline conversion rate
   * @param mde - Minimum detectable effect (relative)
   * @param alpha - Significance level (default 0.05)
   * @param power - Desired power (default 0.8)
   * @returns Required sample size per variant
   */
  calculateRequiredSampleSize(
    baseline: number,
    mde: number,
    alpha: number = 0.05,
    power: number = 0.8
  ): number {
    const zAlpha = this.normalInverseCDF(1 - alpha / 2);
    const zBeta = this.normalInverseCDF(power);

    const p1 = baseline;
    const p2 = baseline * (1 + mde);
    const pooledP = (p1 + p2) / 2;

    const numerator = Math.pow(zAlpha + zBeta, 2) * 2 * pooledP * (1 - pooledP);
    const denominator = Math.pow(p2 - p1, 2);

    return Math.ceil(numerator / denominator);
  }

  /**
   * Calculate mean
   */
  calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate median
   */
  calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);

    return Math.sqrt(variance);
  }

  /**
   * Calculate variance
   */
  calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));

    return this.calculateMean(squaredDiffs);
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Bayesian probability that variant B beats variant A
   * Using Beta distribution approximation
   */
  calculateBayesianProbability(
    conversionsA: number,
    totalA: number,
    conversionsB: number,
    totalB: number,
    samples: number = 10000
  ): number {
    // Using Monte Carlo simulation with Beta distributions
    let bWins = 0;

    for (let i = 0; i < samples; i++) {
      const pA = this.sampleBeta(conversionsA + 1, totalA - conversionsA + 1);
      const pB = this.sampleBeta(conversionsB + 1, totalB - conversionsB + 1);

      if (pB > pA) bWins++;
    }

    return bWins / samples;
  }

  /**
   * Sample from Beta distribution (simplified using normal approximation)
   */
  private sampleBeta(alpha: number, beta: number): number {
    // For large alpha and beta, use normal approximation
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const stdDev = Math.sqrt(variance);

    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    return Math.max(0, Math.min(1, mean + z * stdDev));
  }

  /**
   * Normal CDF (cumulative distribution function)
   * Using approximation for standard normal distribution
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return x > 0 ? 1 - prob : prob;
  }

  /**
   * Inverse normal CDF (quantile function)
   * Using Beasley-Springer-Moro algorithm approximation
   */
  private normalInverseCDF(p: number): number {
    if (p <= 0 || p >= 1) {
      throw new Error('Probability must be between 0 and 1');
    }

    const a = [
      -3.969683028665376e1,
      2.209460984245205e2,
      -2.759285104469687e2,
      1.383577518672690e2,
      -3.066479806614716e1,
      2.506628277459239
    ];

    const b = [
      -5.447609879822406e1,
      1.615858368580409e2,
      -1.556989798598866e2,
      6.680131188771972e1,
      -1.328068155288572e1
    ];

    const c = [
      -7.784894002430293e-3,
      -3.223964580411365e-1,
      -2.400758277161838,
      -2.549732539343734,
      4.374664141464968,
      2.938163982698783
    ];

    const d = [
      7.784695709041462e-3,
      3.224671290700398e-1,
      2.445134137142996,
      3.754408661907416
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number;
    let r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }
}
