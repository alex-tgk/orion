/**
 * Database Setup Utilities for E2E Tests
 * Handles test database creation, migration, and cleanup
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let prisma: PrismaClient;
let testDatabaseUrl: string;

/**
 * Set up test database
 * Creates a new test database and runs migrations
 */
export async function setupTestDatabase(): Promise<void> {
  // Generate unique test database name
  const timestamp = Date.now();
  const testDbName = `orion_test_${timestamp}`;

  // Use environment variable or default test database URL
  const baseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  testDatabaseUrl = baseUrl.replace(/\/[^\/]+$/, `/${testDbName}`);

  // Set environment variable for Prisma
  process.env.DATABASE_URL = testDatabaseUrl;

  try {
    // Create test database
    await execAsync(`createdb ${testDbName}`);

    // Run migrations
    await execAsync('npx prisma migrate deploy');

    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });

    await prisma.$connect();

    console.log(`Test database ${testDbName} created and connected`);
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Tear down test database
 * Disconnects from database and drops it
 */
export async function teardownTestDatabase(): Promise<void> {
  try {
    if (prisma) {
      await prisma.$disconnect();
    }

    if (testDatabaseUrl) {
      const dbName = testDatabaseUrl.split('/').pop();
      await execAsync(`dropdb ${dbName}`);
      console.log(`Test database ${dbName} dropped`);
    }
  } catch (error) {
    console.error('Failed to teardown test database:', error);
    // Don't throw - allow tests to complete
  }
}

/**
 * Get Prisma client instance for tests
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }
  return prisma;
}

/**
 * Clear all data from test database
 * Useful for test isolation
 */
export async function clearDatabase(): Promise<void> {
  const client = getPrismaClient();

  // Get all table names
  const tables = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  // Truncate all tables
  for (const { tablename } of tables) {
    if (tablename !== '_prisma_migrations') {
      await client.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
}

/**
 * Seed test data
 * @param seedFn - Function that seeds the database
 */
export async function seedTestData(seedFn: (prisma: PrismaClient) => Promise<void>): Promise<void> {
  const client = getPrismaClient();
  await seedFn(client);
}
