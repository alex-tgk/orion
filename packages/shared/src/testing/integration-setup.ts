/**
 * Integration Test Setup
 * Common setup for integration tests
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

/**
 * Setup Integration Test Environment
 * Initializes database and cache connections
 */
export async function setupIntegrationTest(): Promise<void> {
  // Initialize Prisma
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env['TEST_DATABASE_URL'] || process.env['DATABASE_URL'],
      },
    },
  });

  await prisma.$connect();

  // Initialize Redis
  redis = new Redis({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    db: parseInt(process.env['REDIS_TEST_DB'] || '1'), // Use separate DB for tests
  });

  // Clear test data
  await clearTestData();
}

/**
 * Teardown Integration Test Environment
 * Closes all connections
 */
export async function teardownIntegrationTest(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }

  if (redis) {
    await redis.quit();
  }
}

/**
 * Clear all test data
 */
export async function clearTestData(): Promise<void> {
  if (redis) {
    await redis.flushdb();
  }

  if (prisma) {
    // Get all model names from Prisma
    const modelNames = Object.keys(prisma).filter(
      key => !key.startsWith('_') && !key.startsWith('$')
    );

    // Delete all records from each model
    for (const modelName of modelNames) {
      const model = (prisma as any)[modelName];
      if (model && typeof model.deleteMany === 'function') {
        await model.deleteMany({});
      }
    }
  }
}

/**
 * Get Prisma Client
 */
export function getPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma not initialized. Call setupIntegrationTest first.');
  }
  return prisma;
}

/**
 * Get Redis Client
 */
export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call setupIntegrationTest first.');
  }
  return redis;
}

/**
 * Create Integration Test Application
 * Creates a fully configured NestJS application for integration tests
 */
export async function createIntegrationTestApp(
  moduleMetadata: any
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule(
    moduleMetadata
  ).compile();

  const app = moduleFixture.createNestApplication();

  // Configure global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Add other global configurations here
  // app.useGlobalFilters(new AllExceptionsFilter());
  // app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return app;
}

/**
 * Close Integration Test Application
 */
export async function closeIntegrationTestApp(
  app: INestApplication
): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Seed Test Data
 * Generic function to seed test data
 */
export async function seedTestData<T>(
  seedFn: (prisma: PrismaClient, redis: Redis) => Promise<T>
): Promise<T> {
  return seedFn(getPrisma(), getRedis());
}

/**
 * Create Transaction for Test
 * Wraps test in a transaction that can be rolled back
 */
export async function runInTransaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const prismaClient = getPrisma();

  return prismaClient.$transaction(async (tx) => {
    return fn(tx as PrismaClient);
  });
}

/**
 * Wait for Database Connection
 * Retries connection until successful
 */
export async function waitForDatabase(
  maxRetries = 10,
  delay = 1000
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw new Error('Failed to connect to database after max retries');
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Wait for Redis Connection
 * Retries connection until successful
 */
export async function waitForRedis(
  maxRetries = 10,
  delay = 1000
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await redis.ping();
      return;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw new Error('Failed to connect to Redis after max retries');
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
