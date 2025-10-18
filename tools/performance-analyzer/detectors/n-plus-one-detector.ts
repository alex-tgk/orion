/**
 * N+1 Query Detector
 *
 * Detects N+1 query anti-patterns in database access code
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { join } from 'path';
import type { PerformanceIssue } from '../analyzer';

export class NPlusOneDetector {
  /**
   * Detect N+1 query patterns
   */
  async detect(servicePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    // Find all TypeScript files
    const files = await glob(`${servicePath}/**/*.ts`, {
      ignore: ['**/node_modules/**', '**/dist/**'],
    });

    for (const file of files) {
      const fileIssues = await this.analyzeFile(file);
      issues.push(...fileIssues);
    }

    return issues;
  }

  /**
   * Analyze a file for N+1 patterns
   */
  private async analyzeFile(filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Pattern 1: Loop with database query inside
    const loopQueryPattern = /for\s*\(.*\)\s*\{[\s\S]*?(find|findOne|query|select|get)[\s\S]*?\}/g;
    let match;

    while ((match = loopQueryPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      issues.push({
        type: 'n-plus-one',
        severity: 'high',
        location: `${filePath}:${lineNumber}`,
        description: 'Potential N+1 query detected: database query inside loop',
        impact: 'Executes multiple database queries sequentially instead of using a single optimized query',
        detectedAt: new Date(),
      });
    }

    // Pattern 2: forEach with async database call
    const forEachAsyncPattern = /\.forEach\(.*(?:async|await).*(?:find|findOne|query|select|get)/g;

    while ((match = forEachAsyncPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      issues.push({
        type: 'n-plus-one',
        severity: 'high',
        location: `${filePath}:${lineNumber}`,
        description: 'N+1 query in forEach with async database call',
        impact: 'Multiple sequential database queries. Use Promise.all or eager loading instead',
        detectedAt: new Date(),
      });
    }

    // Pattern 3: map with database query
    const mapQueryPattern = /\.map\(.*(?:find|findOne|query|select|get)/g;

    while ((match = mapQueryPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      // Check if there's no Promise.all wrapping it
      const beforeContext = content.substring(Math.max(0, match.index - 100), match.index);
      if (!beforeContext.includes('Promise.all')) {
        issues.push({
          type: 'n-plus-one',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'Database query in map without Promise.all',
          impact: 'Consider using Promise.all for parallel execution or JOIN query',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 4: Missing eager loading (TypeORM/Prisma)
    const relationPattern = /\.find\w*\(\{[^}]*\}\)(?!.*include|relations)/g;

    while ((match = relationPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      // Check if there's a subsequent access to relations
      const afterContext = content.substring(match.index, match.index + 200);
      if (afterContext.match(/\.(user|users|profile|posts|comments|order|items)/)) {
        issues.push({
          type: 'n-plus-one',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'Missing eager loading for relations',
          impact: 'Accessing relations without eager loading causes additional queries',
          detectedAt: new Date(),
        });
      }
    }

    return issues;
  }

  /**
   * Get line number from string index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Suggest fixes for N+1 issues
   */
  suggestFix(issue: PerformanceIssue): string {
    const suggestions = {
      'loop-query': `
// Instead of:
for (const item of items) {
  const user = await userRepository.findOne(item.userId);
  // ...
}

// Use:
const userIds = items.map(item => item.userId);
const users = await userRepository.find({ where: { id: In(userIds) } });
const userMap = new Map(users.map(u => [u.id, u]));
items.forEach(item => {
  const user = userMap.get(item.userId);
  // ...
});
`,
      'foreach-async': `
// Instead of:
items.forEach(async item => {
  const data = await service.find(item.id);
});

// Use:
await Promise.all(items.map(async item => {
  const data = await service.find(item.id);
}));
`,
      'missing-eager-loading': `
// Instead of:
const orders = await orderRepository.find();
orders.forEach(order => {
  console.log(order.user.name); // N+1 here
});

// Use:
const orders = await orderRepository.find({
  relations: ['user'] // TypeORM
  // or include: { user: true } for Prisma
});
orders.forEach(order => {
  console.log(order.user.name);
});
`,
    };

    return suggestions['loop-query']; // Default suggestion
  }
}
