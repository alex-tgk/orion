/**
 * Caching Detector
 *
 * Identifies opportunities for caching to improve performance
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import type { PerformanceIssue } from '../analyzer';

export class CachingDetector {
  /**
   * Detect caching opportunities
   */
  async detect(servicePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

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
   * Analyze file for caching opportunities
   */
  private async analyzeFile(filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const content = await readFile(filePath, 'utf-8');

    // Pattern 1: Repeated API calls with same parameters
    const apiCallPattern = /(get|fetch|request|find|findOne|query)\([^)]*\)/g;
    const apiCalls = new Map<string, number>();
    let match;

    while ((match = apiCallPattern.exec(content)) !== null) {
      const call = match[0];
      apiCalls.set(call, (apiCalls.get(call) || 0) + 1);
    }

    // Check for repeated calls
    for (const [call, count] of apiCalls.entries()) {
      if (count > 2) {
        const firstIndex = content.indexOf(call);
        const lineNumber = this.getLineNumber(content, firstIndex);

        issues.push({
          type: 'missing-cache',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: `Repeated API call detected ${count} times: ${call}`,
          impact: 'Add caching to avoid redundant API calls',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 2: Expensive computations without caching
    const computationPattern = /(?:map|filter|reduce|sort)\([^)]+\)(?:\.[a-z]+\([^)]+\)){2,}/g;

    while ((match = computationPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextBefore = content.substring(Math.max(0, match.index - 200), match.index);

      if (!contextBefore.includes('cache') && !contextBefore.includes('memo')) {
        issues.push({
          type: 'missing-cache',
          severity: 'low',
          location: `${filePath}:${lineNumber}`,
          description: 'Chain of array operations without caching',
          impact: 'Consider memoizing expensive computations',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 3: Database queries without caching
    const dbQueryPattern = /(?:repository|model|prisma)\.\w+\([^)]*\)/g;

    while ((match = dbQueryPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextBefore = content.substring(Math.max(0, match.index - 300), match.index);
      const contextAfter = content.substring(match.index, Math.min(content.length, match.index + 100));

      // Check if it's a read operation without cache
      if (contextAfter.includes('find') || contextAfter.includes('get')) {
        if (!contextBefore.includes('cache') && !contextBefore.includes('redis')) {
          issues.push({
            type: 'missing-cache',
            severity: 'medium',
            location: `${filePath}:${lineNumber}`,
            description: 'Database query without caching layer',
            impact: 'Add Redis or in-memory cache for frequently accessed data',
            detectedAt: new Date(),
          });
        }
      }
    }

    // Pattern 4: Static data loaded repeatedly
    const staticDataPattern = /(readFile|readFileSync|require|import)\s*\([^)]*\.json[^)]*\)/g;

    while ((match = staticDataPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextBefore = content.substring(Math.max(0, match.index - 100), match.index);

      // Check if inside a function (not module level)
      if (contextBefore.includes('function') || contextBefore.includes('=>')) {
        if (!contextBefore.includes('cache') && !contextBefore.includes('const')) {
          issues.push({
            type: 'missing-cache',
            severity: 'low',
            location: `${filePath}:${lineNumber}`,
            description: 'Static data loaded inside function',
            impact: 'Move to module level or cache the result',
            detectedAt: new Date(),
          });
        }
      }
    }

    // Pattern 5: External API calls without caching
    const externalApiPattern = /(?:axios|fetch|http)\.(get|post)\([^)]*\)/g;

    while ((match = externalApiPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextBefore = content.substring(Math.max(0, match.index - 300), match.index);

      if (match[1] === 'get' && !contextBefore.includes('cache')) {
        issues.push({
          type: 'missing-cache',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'External API GET request without caching',
          impact: 'Add HTTP caching headers or application-level cache',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 6: Pure functions without memoization
    const pureFunctionPattern = /function\s+(\w+)\([^)]*\):\s*(?:number|string|boolean|object)/g;

    while ((match = pureFunctionPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const functionName = match[1];
      const functionContent = this.extractFunction(content, match.index);

      // Check if it's a pure function (no side effects)
      if (this.isPureFunction(functionContent)) {
        // Check if it's called multiple times
        const callPattern = new RegExp(`${functionName}\\(`, 'g');
        const calls = content.match(callPattern);

        if (calls && calls.length > 3) {
          issues.push({
            type: 'missing-cache',
            severity: 'low',
            location: `${filePath}:${lineNumber}`,
            description: `Pure function '${functionName}' called ${calls.length} times without memoization`,
            impact: 'Add memoization to cache results for same inputs',
            detectedAt: new Date(),
          });
        }
      }
    }

    return issues;
  }

  /**
   * Extract function body
   */
  private extractFunction(content: string, startIndex: number): string {
    let braceCount = 0;
    let result = '';
    let started = false;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
      }

      result += char;

      if (started && braceCount === 0) {
        break;
      }
    }

    return result;
  }

  /**
   * Check if function is pure (heuristic)
   */
  private isPureFunction(functionContent: string): boolean {
    const impureKeywords = [
      'console.log',
      'localStorage',
      'sessionStorage',
      'fetch(',
      'axios',
      'http.',
      'this.',
      'global.',
      'window.',
      'document.',
      'Math.random',
      'Date.now',
      'new Date',
    ];

    return !impureKeywords.some(keyword => functionContent.includes(keyword));
  }

  /**
   * Get line number from string index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Suggest caching implementation
   */
  suggestCaching(issue: PerformanceIssue): string {
    const suggestions = {
      'api-cache': `
// Add caching with Redis:
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CachedService {
  constructor(private redis: Redis) {}

  async getData(id: string) {
    const cacheKey = \`data:\${id}\`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from source
    const data = await this.fetchFromSource(id);

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(data));

    return data;
  }
}
`,
      'memoization': `
// Add memoization decorator:
function memoize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const cache = new Map();

  descriptor.value = function (...args: any[]) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return descriptor;
}

// Usage:
@memoize
calculateExpensiveValue(input: number): number {
  // expensive calculation
  return input * input;
}
`,
      'lru-cache': `
// Implement LRU cache:
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500, // max items
  maxAge: 1000 * 60 * 60, // 1 hour
});

async function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached) return cached;

  const data = await fetchData(key);
  cache.set(key, data);
  return data;
}
`,
    };

    return suggestions['api-cache']; // Default suggestion
  }
}
