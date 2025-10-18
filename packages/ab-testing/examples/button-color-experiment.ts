/**
 * Sample Experiment: Button Color A/B Test
 *
 * This example demonstrates how to create and run a complete A/B test
 * testing the impact of button color on conversion rates.
 */

import { ABTestingClient } from '@orion/shared/ab-testing';

// Initialize client
const abClient = new ABTestingClient({
  apiUrl: 'http://localhost:3007',
  apiKey: process.env.AB_TESTING_API_KEY,
});

// 1. Create Experiment
async function createButtonColorExperiment() {
  const experiment = {
    key: 'button-color-test-2025',
    name: 'Button Color Optimization',
    description: 'Testing button colors to optimize conversion rate',
    hypothesis: 'Blue buttons will increase conversions by 15% due to better contrast and perceived trustworthiness',

    type: 'AB_TEST',
    allocationStrategy: 'DETERMINISTIC',
    trafficAllocation: 1.0,

    variants: [
      {
        key: 'control',
        name: 'Green Button (Control)',
        description: 'Current green button',
        isControl: true,
        weight: 1.0,
        config: {
          buttonColor: '#28a745',
          buttonText: 'Sign Up Now',
        },
      },
      {
        key: 'blue_button',
        name: 'Blue Button',
        description: 'Testing blue button variant',
        weight: 1.0,
        config: {
          buttonColor: '#007bff',
          buttonText: 'Sign Up Now',
        },
      },
    ],

    metrics: [
      {
        key: 'signup_conversion',
        name: 'Sign Up Conversion',
        description: 'User completed sign up form',
        type: 'CONVERSION',
        aggregation: 'AVERAGE',
        isPrimary: true,
        expectedValue: 0.12, // 12% baseline
        targetValue: 0.138,  // 15% improvement
      },
      {
        key: 'time_to_signup',
        name: 'Time to Sign Up',
        description: 'Seconds from page load to signup',
        type: 'ENGAGEMENT',
        aggregation: 'AVERAGE',
        isPrimary: false,
      },
      {
        key: 'button_clicks',
        name: 'Button Clicks',
        description: 'Number of button clicks',
        type: 'CUSTOM',
        aggregation: 'COUNT',
        isPrimary: false,
      },
    ],

    targetingRules: {
      includeRules: [
        {
          attribute: 'userType',
          operator: 'equals',
          value: 'new',
        },
      ],
      excludeRules: [
        {
          attribute: 'isEmployee',
          operator: 'equals',
          value: true,
        },
      ],
    },

    statisticalConfig: {
      significanceLevel: 'P_95',
      minimumSampleSize: 2000, // 2000 users per variant
      minimumDetectable: 0.15,  // 15% MDE
      powerAnalysis: 0.80,      // 80% power
    },

    schedule: {
      startAt: new Date('2025-11-01T00:00:00Z'),
      duration: 14 * 24 * 60 * 60, // 14 days
    },

    ownerId: 'user-growth-team',
    teamId: 'growth',
    tags: ['signup', 'cro', 'q4-2025'],
  };

  const response = await fetch('http://localhost:3007/api/v1/experiments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(experiment),
  });

  const created = await response.json();
  console.log('Experiment created:', created);
  return created;
}

// 2. Get Variant for User
async function getVariantForUser(userId: string) {
  const assignment = await abClient.getVariant('button-color-test-2025', {
    userId,
    attributes: {
      userType: 'new',
      platform: 'web',
      country: 'US',
    },
  });

  console.log(`User ${userId} assigned to variant: ${assignment.variantKey}`);
  console.log('Button color:', assignment.config.buttonColor);

  return assignment;
}

// 3. Track User Interactions
async function trackUserJourney(userId: string) {
  // Track button click
  await abClient.trackMetric(
    'button-color-test-2025',
    'button_clicks',
    1,
    userId
  );

  // Simulate user completing signup
  const timeToSignup = Math.random() * 120; // Random time 0-120 seconds

  await abClient.trackMetric(
    'button-color-test-2025',
    'time_to_signup',
    timeToSignup,
    userId
  );

  // Track conversion
  await abClient.trackConversion('button-color-test-2025', userId);

  console.log(`User ${userId} converted in ${timeToSignup.toFixed(1)}s`);
}

// 4. Check Results
async function checkExperimentResults() {
  const response = await fetch(
    'http://localhost:3007/api/v1/experiments/button-color-test-2025/results'
  );

  const results = await response.json();

  console.log('\n=== Experiment Results ===');
  console.log(`Status: ${results.status}`);
  console.log(`\nVariants:`);

  results.variants.forEach((variant: any) => {
    console.log(`\n${variant.variantName}:`);
    console.log(`  Assignments: ${variant.assignmentCount}`);
    console.log(`  Conversions: ${variant.conversionCount}`);
    console.log(`  Conversion Rate: ${(variant.conversionRate * 100).toFixed(2)}%`);
    console.log(`  95% CI: [${(variant.confidenceInterval[0] * 100).toFixed(2)}%, ${(variant.confidenceInterval[1] * 100).toFixed(2)}%]`);
  });

  console.log(`\n=== Statistical Analysis ===`);
  console.log(`P-Value: ${results.analysis.pValue.toFixed(4)}`);
  console.log(`Significant: ${results.analysis.isSignificant ? 'YES' : 'NO'}`);
  console.log(`Relative Uplift: ${results.analysis.relativeUplift?.toFixed(2)}%`);
  console.log(`Winner: ${results.analysis.winnerVariant || 'TBD'}`);

  console.log(`\n=== Recommendation ===`);
  console.log(results.recommendation);

  return results;
}

// 5. Simulate Experiment
async function simulateExperiment() {
  console.log('Starting experiment simulation...\n');

  // Simulate 1000 users
  const totalUsers = 1000;
  const controlConversionRate = 0.12;  // 12%
  const variantConversionRate = 0.138; // 13.8% (15% improvement)

  for (let i = 0; i < totalUsers; i++) {
    const userId = `user-${i}`;

    // Get variant assignment
    const assignment = await getVariantForUser(userId);

    // Determine if user converts based on variant
    const conversionRate = assignment.variantKey === 'control'
      ? controlConversionRate
      : variantConversionRate;

    const converts = Math.random() < conversionRate;

    if (converts) {
      await trackUserJourney(userId);
    }

    // Log progress
    if ((i + 1) % 100 === 0) {
      console.log(`Processed ${i + 1}/${totalUsers} users`);
    }
  }

  console.log('\nSimulation complete! Checking results...\n');

  // Check results
  await checkExperimentResults();
}

// 6. Conclude Experiment
async function concludeExperiment(winnerVariantKey: string) {
  const response = await fetch(
    'http://localhost:3007/api/v1/experiments/button-color-test-2025/conclude',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'admin-123',
        winnerVariantKey,
      }),
    }
  );

  const result = await response.json();
  console.log('Experiment concluded:', result);
}

// Main execution
async function main() {
  try {
    // Create experiment
    await createButtonColorExperiment();

    // Start experiment
    const startResponse = await fetch(
      'http://localhost:3007/api/v1/experiments/button-color-test-2025/start',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'admin-123' }),
      }
    );
    console.log('Experiment started:', await startResponse.json());

    // Simulate experiment (in production, this would be real user traffic)
    await simulateExperiment();

    // Analyze and conclude
    const results = await checkExperimentResults();

    if (results.analysis.isSignificant && results.analysis.winnerVariant) {
      console.log(`\nDeclaring winner: ${results.analysis.winnerVariant}`);
      await concludeExperiment(results.analysis.winnerVariant);
    }
  } catch (error) {
    console.error('Error running experiment:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { createButtonColorExperiment, getVariantForUser, trackUserJourney, checkExperimentResults };
