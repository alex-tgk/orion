import { PrismaClient } from '@prisma/client';

/**
 * Test database utilities for integration tests
 */
export class TestDatabase {
  private static prisma: PrismaClient;

  /**
   * Initialize test database connection
   */
  static async initialize(): Promise<PrismaClient> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/orion_test',
          },
        },
      });

      await this.prisma.$connect();
    }

    return this.prisma;
  }

  /**
   * Clean all tables in the database
   */
  static async cleanup(): Promise<void> {
    if (!this.prisma) return;

    const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`);
      }
    }
  }

  /**
   * Seed test data
   */
  static async seed(data: Record<string, any[]>): Promise<void> {
    if (!this.prisma) await this.initialize();

    for (const [table, records] of Object.entries(data)) {
      for (const record of records) {
        await (this.prisma as any)[table].create({ data: record });
      }
    }
  }

  /**
   * Close database connection
   */
  static async close(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Get Prisma client instance
   */
  static getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prisma;
  }
}
