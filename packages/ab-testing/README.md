# A/B Testing Service

Production-grade A/B testing and experimentation platform for the ORION ecosystem.

## Features

- **Experiment Management**: Create, manage, and analyze experiments
- **User Bucketing**: Consistent deterministic hashing for user assignment
- **Multiple Allocation Strategies**: Deterministic, random, weighted, and adaptive
- **Statistical Analysis**: Built-in statistical significance testing
- **Metrics Tracking**: Track conversions, revenue, engagement, and custom metrics
- **Bayesian Analysis**: Probability-based analysis for decision making
- **Feature Flag Integration**: Seamless integration with feature flags
- **Client SDK**: Easy-to-use client library for frontend integration
- **Real-time Results**: Live experiment results and analysis

## Quick Start

### Installation

```bash
npm install @orion/ab-testing
```

### Environment Variables

```env
AB_TESTING_DATABASE_URL=postgresql://user:password@localhost:5432/ab_testing
AB_TESTING_PORT=3007
```

### Start the Service

```bash
# Development
nx serve ab-testing

# Production
nx build ab-testing
node dist/packages/ab-testing/main.js
```

### API Documentation

Once running, visit: http://localhost:3007/api/docs

## Usage

### 1. Create an Experiment

```typescript
const experiment = {
  key: 'button-color-test',
  name: 'Button Color Optimization',
  type: 'AB_TEST',
  variants: [
    {
      key: 'control',
      name: 'Green Button',
      isControl: true,
      weight: 1.0,
      config: { color: 'green' }
    },
    {
      key: 'blue_button',
      name: 'Blue Button',
      weight: 1.0,
      config: { color: 'blue' }
    }
  ],
  metrics: [
    {
      key: 'conversion',
      name: 'Conversion Rate',
      type: 'CONVERSION',
      aggregation: 'AVERAGE',
      isPrimary: true
    }
  ],
  ownerId: 'user-123'
};

const response = await fetch('http://localhost:3007/api/v1/experiments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(experiment)
});
```

### 2. Get Variant Assignment

```typescript
const assignment = await fetch(
  'http://localhost:3007/api/v1/experiments/button-color-test/assignment?userId=user-456'
);

const variant = await assignment.json();
console.log(variant.variantKey); // 'control' or 'blue_button'
```

### 3. Track Conversion

```typescript
await fetch('http://localhost:3007/api/v1/experiments/button-color-test/conversion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-456',
    value: 1
  })
});
```

### 4. Get Results

```typescript
const results = await fetch(
  'http://localhost:3007/api/v1/experiments/button-color-test/results'
);

const data = await results.json();
console.log(data.analysis.isSignificant);
console.log(data.analysis.relativeUplift);
```

## Client SDK

```typescript
import { ABTestingClient } from '@orion/shared/ab-testing';

const client = new ABTestingClient({
  apiUrl: 'http://localhost:3007',
  apiKey: 'your-api-key'
});

// Get variant
const variant = await client.getVariant('button-color-test', {
  userId: 'user-456',
  attributes: { country: 'US' }
});

// Track conversion
await client.trackConversion('button-color-test', 'user-456');

// Check if user is in specific variant
const isBlue = await client.isInVariant('button-color-test', 'blue_button', {
  userId: 'user-456'
});
```

## Architecture

### Database Schema

- **Experiment**: Experiment configuration and metadata
- **ExperimentVariant**: Variant definitions and performance
- **ExperimentAssignment**: User-to-variant mappings
- **ExperimentMetric**: Metric definitions
- **MetricValue**: Actual metric data points
- **ExperimentResult**: Statistical analysis results
- **ExperimentEvent**: Audit trail
- **ExperimentOverride**: Manual variant assignments

### Services

- **ABTestingService**: Main service for experiment management
- **BucketingService**: User bucketing and assignment logic
- **StatisticsService**: Statistical analysis and calculations

### Statistical Methods

- Two-proportion z-test
- Confidence intervals
- Effect size (Cohen's h)
- Bayesian probability estimation
- Power analysis
- Sample size calculation

## Testing

```bash
# Unit tests
nx test ab-testing

# Integration tests
nx test ab-testing --configuration=integration

# Test coverage
nx test ab-testing --coverage
```

## Examples

See `/examples` directory for:
- `button-color-experiment.ts`: Complete button color A/B test example
- `multivariate-test.ts`: Multi-variant testing example
- `revenue-test.ts`: Revenue-based experiment example

## Best Practices

1. **Sample Size**: Ensure minimum 1000 conversions per variant
2. **Duration**: Run experiments for at least 1-2 weeks
3. **Significance**: Use 95% confidence level (p < 0.05)
4. **Power**: Aim for 80% statistical power
5. **One Variable**: Test one change at a time
6. **Hypothesis-Driven**: Start with clear hypothesis
7. **Avoid Peeking**: Don't stop experiments early

## API Endpoints

- `POST /api/v1/experiments` - Create experiment
- `GET /api/v1/experiments/:key` - Get experiment
- `POST /api/v1/experiments/:key/start` - Start experiment
- `POST /api/v1/experiments/:key/pause` - Pause experiment
- `POST /api/v1/experiments/:key/conclude` - Conclude experiment
- `GET /api/v1/experiments/:key/assignment` - Get variant assignment
- `POST /api/v1/experiments/:key/track` - Track metric
- `POST /api/v1/experiments/:key/conversion` - Track conversion
- `GET /api/v1/experiments/:key/results` - Get results
- `GET /api/v1/experiments/:key/analyze` - Analyze significance

## Documentation

Full documentation available at `/docs/features/ab-testing.md`

## License

MIT
