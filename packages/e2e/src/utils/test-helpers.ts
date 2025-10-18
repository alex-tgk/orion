/**
 * E2E Test Helper Utilities
 * Common utilities for E2E tests
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

/**
 * Create and initialize a test application
 * @param moduleMetadata - Module metadata for testing module
 */
export async function createTestApp(moduleMetadata: any): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule(
    moduleMetadata
  ).compile();

  const app = moduleFixture.createNestApplication();

  // Configure app (middleware, pipes, etc.)
  // app.useGlobalPipes(new ValidationPipe());
  // app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  return app;
}

/**
 * Close test application
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Create authenticated request
 * @param app - Nest application
 * @param token - JWT token
 */
export function authenticatedRequest(app: INestApplication, token: string) {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}

/**
 * Wait for condition to be true
 * @param condition - Function that returns boolean
 * @param timeout - Maximum time to wait in ms
 * @param interval - Check interval in ms
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate random username for testing
 */
export function generateTestUsername(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
