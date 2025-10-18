# A/B Testing Framework

## Overview

The ORION A/B Testing Framework provides a comprehensive, production-ready solution for running controlled experiments and measuring their impact. Built with statistical rigor and developer experience in mind, it enables data-driven decision making through systematic testing.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Getting Started](#getting-started)
- [Creating Experiments](#creating-experiments)
- [Tracking Metrics](#tracking-metrics)
- [Interpreting Results](#interpreting-results)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)
- [Client SDK](#client-sdk)
- [Statistical Significance](#statistical-significance)

## Core Concepts

### What is A/B Testing?

A/B testing is a method of comparing two or more versions of a feature, page, or experience to determine which performs better. Users are randomly assigned to different variants, and their behavior is measured to identify the winning variant.

### Key Components

1. **Experiment**: A controlled test with multiple variants
2. **Variant**: A specific version being tested (e.g., control, variant_a)
3. **Metric**: A measurable outcome (e.g., conversion rate, revenue)
4. **Assignment**: The process of allocating users to variants
5. **Analysis**: Statistical evaluation of experiment results

### Experiment Types

- **A/B Test**: Traditional two-variant test (control vs variant)
- **Multivariate**: Testing multiple variants simultaneously
- **Multi-Armed Bandit**: Dynamic allocation based on performance
- **Sequential**: Testing with early stopping rules

## Getting Started

### Installation

The A/B Testing service is included in the ORION platform. No additional installation is required.

### Quick Start

```typescript
import { ABTestingClient } from '@orion/shared/ab-testing';

// Initialize client
const abClient = new ABTestingClient({
  apiUrl: 'http://localhost:3007',
  apiKey: 'your-api-key',
});

// Get variant for user
const assignment = await abClient.getVariant('button-color-test', {
  userId: 'user-123',
  attributes: {
    country: 'US',
    platform: 'web',
  },
});

console.log(`User assigned to variant: ${assignment.variantKey}`);

// Use variant config
if (assignment.config.buttonColor === 'blue') {
  // Show blue button
} else {
  // Show default button
}

// Track conversion
await abClient.trackConversion('button-color-test', 'user-123');
```

## Creating Experiments

### Experiment Configuration

```typescript
const experimentConfig = {
  key: 'checkout-flow-optimization',
  name: 'Checkout Flow Optimization',
  description: 'Testing simplified checkout flow vs current flow',
  hypothesis: 'Reducing checkout steps will increase conversion rate',

  // Experiment type
  type: 'AB_TEST',

  // Allocation settings
  allocationStrategy: 'DETERMINISTIC', // Consistent assignment
  trafficAllocation: 1.0, // 100% of users

  // Variants
  variants: [
    {
      key: 'control',
      name: 'Current Checkout',
      isControl: true,
      weight: 1.0,
      config: {
        steps: 3,
        layout: 'default',
      },
    },
    {
      key: 'simplified',
      name: 'Simplified Checkout',
      weight: 1.0,
      config: {
        steps: 1,
        layout: 'simplified',
      },
    },
  ],

  // Metrics to track
  metrics: [
    {
      key: 'purchase_conversion',
      name: 'Purchase Conversion',
      type: 'CONVERSION',
      aggregation: 'AVERAGE',
      isPrimary: true,
      expectedValue: 0.15, // 15% baseline
      targetValue: 0.18,   // 18% target
    },
    {
      key: 'revenue',
      name: 'Average Order Value',
      type: 'REVENUE',
      aggregation: 'AVERAGE',
      isPrimary: false,
    },
  ],

  // Targeting
  targetingRules: {
    includeRules: [
      {
        attribute: 'country',
        operator: 'in',
        value: ['US', 'CA', 'UK'],
      },
    ],
    excludeRules: [
      {
        attribute: 'userType',
        operator: 'equals',
        value: 'internal',
      },
    ],
  },

  // Statistical configuration
  statisticalConfig: {
    significanceLevel: 'P_95', // 95% confidence
    minimumSampleSize: 1000,
    minimumDetectable: 0.05, // 5% minimum detectable effect
    powerAnalysis: 0.8, // 80% statistical power
  },

  // Schedule
  schedule: {
    startAt: new Date('2025-11-01T00:00:00Z'),
    duration: 14 * 24 * 60 * 60, // 14 days in seconds
  },

  // Metadata
  ownerId: 'user-456',
  teamId: 'growth-team',
  tags: ['checkout', 'conversion', 'q4-2025'],
};

// Create experiment
const experiment = await fetch('http://localhost:3007/api/v1/experiments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(experimentConfig),
});
```

### Allocation Strategies

1. **Deterministic (Recommended)**
   - Uses consistent hashing based on user ID
   - Same user always gets same variant
   - Best for most use cases

2. **Random**
   - Random assignment each time
   - Use when testing session-based experiences

3. **Weighted**
   - Allows different traffic percentages per variant
   - Useful for gradual rollouts

4. **Adaptive**
   - Dynamically adjusts based on performance
   - Advanced: requires ML integration

## Tracking Metrics

### Conversion Tracking

```typescript
// Track when user completes desired action
await abClient.trackConversion('checkout-flow-optimization', 'user-123');

// Track conversion with value (for revenue)
await abClient.trackConversion('checkout-flow-optimization', 'user-123', 99.99);
```

### Custom Metrics

```typescript
// Track engagement metric
await abClient.trackMetric(
  'checkout-flow-optimization',
  'time_to_purchase',
  45.2, // seconds
  'user-123'
);

// Track with context
await abClient.trackMetric(
  'checkout-flow-optimization',
  'cart_abandonment',
  1,
  'user-123',
  {
    cartValue: 150.00,
    itemCount: 3,
  }
);
```

### Metric Types

- **CONVERSION**: Binary success/failure (0 or 1)
- **REVENUE**: Monetary values
- **ENGAGEMENT**: Time, clicks, interactions
- **CUSTOM**: Any custom measurement

## Interpreting Results

### Getting Results

```typescript
const results = await fetch(
  'http://localhost:3007/api/v1/experiments/checkout-flow-optimization/results'
);

console.log(results);
```

### Result Structure

```typescript
{
  experimentKey: 'checkout-flow-optimization',
  status: 'RUNNING',
  variants: [
    {
      variantKey: 'control',
      variantName: 'Current Checkout',
      isControl: true,
      assignmentCount: 5243,
      conversionCount: 787,
      conversionRate: 0.1501,
      confidenceInterval: [0.1402, 0.1600],
      standardError: 0.0049,
    },
    {
      variantKey: 'simplified',
      variantName: 'Simplified Checkout',
      isControl: false,
      assignmentCount: 5189,
      conversionCount: 935,
      conversionRate: 0.1802,
      confidenceInterval: [0.1697, 0.1907],
      standardError: 0.0053,
    },
  ],
  analysis: {
    analysisType: 'two_proportion_z_test',
    pValue: 0.0001,
    confidenceLevel: 0.9999,
    isSignificant: true,
    effectSize: 0.0621,
    relativeUplift: 20.05, // 20% improvement!
    absoluteUplift: 0.0301,
    winnerVariant: 'simplified',
    probabilityToBeBest: 0.997,
  },
  recommendation: 'Variant shows 20.05% improvement over control',
  recommendedAction: 'declare_winner',
}
```

### Understanding Statistical Metrics

1. **P-Value**: Probability that results occurred by chance
   - p < 0.05: Significant at 95% confidence
   - p < 0.01: Significant at 99% confidence

2. **Confidence Interval**: Range where true value likely falls
   - Narrower = more precise estimate
   - Should not overlap between variants for significance

3. **Effect Size**: Magnitude of difference
   - Cohen's h > 0.2: Small effect
   - Cohen's h > 0.5: Medium effect
   - Cohen's h > 0.8: Large effect

4. **Relative Uplift**: Percentage improvement over control
   - Example: 20% means variant is 20% better

5. **Probability to be Best**: Bayesian probability variant is best
   - > 0.95: High confidence variant is winner
   - 0.50-0.95: Lean towards variant but not conclusive

## Best Practices

### 1. Sample Size and Duration

```typescript
// Calculate required sample size
const requiredSampleSize = statisticsService.calculateRequiredSampleSize(
  0.15,  // baseline conversion rate
  0.05,  // minimum detectable effect (5%)
  0.05,  // significance level (95% confidence)
  0.80   // statistical power (80%)
);

console.log(`Required sample size: ${requiredSampleSize} per variant`);
```

**Guidelines:**
- Minimum 1000 conversions per variant
- Run for at least 1-2 weeks to capture weekly patterns
- Don't stop early even if results look significant
- Account for seasonality and external factors

### 2. Hypothesis-Driven Testing

Always start with a clear hypothesis:
- ❌ "Let's test a blue button"
- ✅ "Changing the CTA button to blue will increase conversions by 10% because it creates better contrast and draws attention"

### 3. One Variable at a Time

- Test one change per experiment
- If testing multiple changes, use multivariate testing
- Avoid confounding variables

### 4. Statistical Significance

**Don't declare winners too early!**

```typescript
// Check if experiment has reached significance
const analysis = await abClient.analyzeSignificance('my-experiment');

if (analysis.isSignificant &&
    analysis.pValue < 0.05 &&
    analysis.totalSampleSize >= minimumSampleSize) {
  // Safe to conclude
  await concludeExperiment('my-experiment', 'user-id', winnerVariant);
} else {
  // Keep running
  console.log('Continue running experiment');
}
```

### 5. Avoid Common Pitfalls

**Peeking Problem**: Looking at results multiple times increases false positive rate
- Solution: Use sequential testing or pre-commit to sample size

**Simpson's Paradox**: Aggregated results differ from segment results
- Solution: Segment analysis by user cohorts

**Novelty Effect**: Users react to changes because they're new
- Solution: Run tests for 2+ weeks

**Selection Bias**: Non-random assignment
- Solution: Use deterministic hashing for consistent assignment

### 6. Segmentation Analysis

```typescript
// Analyze results by segment
const segmentedResults = {
  mobile: await getResults('my-experiment', { platform: 'mobile' }),
  desktop: await getResults('my-experiment', { platform: 'desktop' }),
};

// Check for consistent effects across segments
```

### 7. Multiple Testing Correction

When running multiple experiments or metrics:

```typescript
// Apply Bonferroni correction
const adjustedAlpha = 0.05 / numberOfTests;

// Or use Benjamini-Hochberg for less conservative approach
```

## API Reference

### Endpoints

#### Create Experiment
```http
POST /api/v1/experiments
Content-Type: application/json

{
  "key": "experiment-key",
  "name": "Experiment Name",
  "variants": [...],
  "metrics": [...]
}
```

#### Get Variant Assignment
```http
GET /api/v1/experiments/:key/assignment?userId=user-123
```

#### Track Metric
```http
POST /api/v1/experiments/:key/track
Content-Type: application/json

{
  "userId": "user-123",
  "metricKey": "conversion",
  "value": 1
}
```

#### Get Results
```http
GET /api/v1/experiments/:key/results
```

#### Start Experiment
```http
POST /api/v1/experiments/:key/start
Content-Type: application/json

{
  "userId": "admin-123"
}
```

#### Conclude Experiment
```http
POST /api/v1/experiments/:key/conclude
Content-Type: application/json

{
  "userId": "admin-123",
  "winnerVariantKey": "variant_a"
}
```

## Client SDK

### React Integration

```typescript
import { useABTest } from '@orion/shared/ab-testing';

function CheckoutButton() {
  const { variant, trackConversion } = useABTest('button-color-test', abClient);

  const handleClick = async () => {
    // Handle click
    await trackConversion();
  };

  return (
    <button
      style={{ backgroundColor: variant?.config.color }}
      onClick={handleClick}
    >
      Checkout
    </button>
  );
}
```

### Configuration

```typescript
const abClient = new ABTestingClient({
  apiUrl: process.env.AB_TESTING_API_URL,
  apiKey: process.env.AB_TESTING_API_KEY,
  timeout: 5000,
  cache: true,
  cacheTTL: 300000, // 5 minutes
});
```

## Statistical Significance

### Understanding P-Values

The p-value represents the probability of observing results as extreme as yours if there were no real difference between variants.

- **p < 0.05**: Less than 5% chance results are due to random chance (95% confident)
- **p < 0.01**: Less than 1% chance (99% confident)
- **p < 0.001**: Less than 0.1% chance (99.9% confident)

### Power Analysis

Statistical power is the probability of detecting a real effect if it exists.

- **80% power** (recommended minimum): 80% chance of detecting effect
- **90% power** (better): 90% chance of detecting effect

Higher power requires larger sample sizes.

### Minimum Detectable Effect (MDE)

The smallest effect size you want to detect reliably.

- **5% MDE**: Can detect 5% relative improvement
- **10% MDE**: Can detect 10% relative improvement

Smaller MDE requires larger sample sizes.

### Sample Size Calculator

```typescript
const sampleSize = calculateRequiredSampleSize(
  baselineRate,    // e.g., 0.15 (15%)
  mde,            // e.g., 0.05 (5% relative change)
  alpha,          // e.g., 0.05 (95% confidence)
  power           // e.g., 0.80 (80% power)
);
```

## Advanced Topics

### Sequential Testing

Allows peeking at results without inflating false positive rate.

### Bayesian A/B Testing

Uses probability distributions to estimate likelihood variant is best.

```typescript
const bayesianProb = calculateBayesianProbability(
  controlConversions,
  controlTotal,
  variantConversions,
  variantTotal
);

console.log(`Probability variant is best: ${(bayesianProb * 100).toFixed(1)}%`);
```

### Multi-Armed Bandit

Dynamically allocates more traffic to better-performing variants.

### Feature Flag Integration

Integrate experiments with feature flags for gradual rollouts.

```typescript
{
  featureFlagKey: 'new-checkout-flow',
  // Experiment controls feature flag
}
```

## Troubleshooting

### Low Conversion Rates

- Verify tracking is implemented correctly
- Check for technical issues preventing conversions
- Ensure sample size is sufficient

### Inconsistent Results

- Check for selection bias
- Verify random assignment is working
- Look for external factors (seasonality, campaigns)

### No Significant Results

- Increase sample size
- Run for longer duration
- Consider if MDE is too small

## Resources

- [Statistical Power Calculator](https://www.stat.ubc.ca/~rollin/stats/ssize/n2.html)
- [Evan Miller's A/B Test Tools](https://www.evanmiller.org/ab-testing/)
- [Optimizely's Stats Engine](https://www.optimizely.com/optimization-glossary/statistical-significance/)

## Support

For questions or issues:
- GitHub Issues: [orion/issues](https://github.com/orion/issues)
- Slack: #ab-testing
- Email: growth@orion.com
