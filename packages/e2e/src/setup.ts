/**
 * E2E Test Setup
 * Configures global test environment and cleanup
 */

import { setupTestDatabase, teardownTestDatabase } from './utils/database-setup';

// Increase timeout for E2E tests
jest.setTimeout(30000);

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  await setupTestDatabase();
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  await teardownTestDatabase();
});

/**
 * Clean up after each test
 */
afterEach(async () => {
  // Clear any test data created during the test
  // This ensures test isolation
});
