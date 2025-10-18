/**
 * Memory Leak Detector
 *
 * Detects common memory leak patterns in code
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import type { PerformanceIssue } from '../analyzer';

export class MemoryLeakDetector {
  /**
   * Detect memory leak patterns
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
   * Analyze file for memory leak patterns
   */
  private async analyzeFile(filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const content = await readFile(filePath, 'utf-8');

    // Pattern 1: Event listeners without cleanup
    const eventListenerPattern = /(?:addEventListener|on\(|subscribe\()[\s\S]*?(?!removeEventListener|unsubscribe|off\()/g;
    let match;

    while ((match = eventListenerPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextBefore = content.substring(Math.max(0, match.index - 300), match.index);
      const contextAfter = content.substring(match.index, match.index + 300);

      // Check if there's a cleanup in OnDestroy or similar
      if (!contextAfter.includes('removeEventListener') &&
          !contextAfter.includes('unsubscribe') &&
          !contextAfter.includes('ngOnDestroy')) {
        issues.push({
          type: 'memory-leak',
          severity: 'high',
          location: `${filePath}:${lineNumber}`,
          description: 'Event listener registered without cleanup',
          impact: 'Event listeners accumulate in memory, causing memory leaks',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 2: Timers without cleanup
    const timerPattern = /(setInterval|setTimeout)\(/g;

    while ((match = timerPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextAfter = content.substring(match.index, match.index + 500);

      if (!contextAfter.includes('clearInterval') &&
          !contextAfter.includes('clearTimeout') &&
          match[1] === 'setInterval') {
        issues.push({
          type: 'memory-leak',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'setInterval without clearInterval',
          impact: 'Timer continues running indefinitely, preventing garbage collection',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 3: Global state accumulation
    const globalArrayPattern = /(?:export\s+)?(?:const|let|var)\s+\w+\s*:\s*.*\[\]\s*=\s*\[\]/g;

    while ((match = globalArrayPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const varName = match[0].match(/\s+(\w+)\s*:/)?.[1];

      if (varName) {
        // Check if this array is pushed to without being cleared
        const pushPattern = new RegExp(`${varName}\\.push\\(`, 'g');
        const clearPattern = new RegExp(`${varName}\\s*=\\s*\\[\\]|${varName}\\.length\\s*=\\s*0`, 'g');

        const hasPush = pushPattern.test(content);
        const hasClear = clearPattern.test(content);

        if (hasPush && !hasClear) {
          issues.push({
            type: 'memory-leak',
            severity: 'medium',
            location: `${filePath}:${lineNumber}`,
            description: `Global array '${varName}' grows without bounds`,
            impact: 'Array accumulates data indefinitely, causing memory growth',
            detectedAt: new Date(),
          });
        }
      }
    }

    // Pattern 4: Closures capturing large objects
    const closurePattern = /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?return\s+function/g;

    while ((match = closurePattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const closureContent = match[0];

      // Check if it captures large data structures
      if (closureContent.includes('new Array') ||
          closureContent.includes('new Map') ||
          closureContent.includes('new Set')) {
        issues.push({
          type: 'memory-leak',
          severity: 'low',
          location: `${filePath}:${lineNumber}`,
          description: 'Closure potentially capturing large objects',
          impact: 'Closures prevent garbage collection of captured variables',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 5: Cache without size limits
    const cachePattern = /(?:cache|map|store)\s*=\s*new\s+(?:Map|WeakMap|Set)/g;

    while ((match = cachePattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const contextAfter = content.substring(match.index, match.index + 1000);

      // Check if there's size management
      if (!contextAfter.includes('.delete(') &&
          !contextAfter.includes('.clear()') &&
          !contextAfter.includes('maxSize') &&
          !contextAfter.includes('MAX_SIZE')) {
        issues.push({
          type: 'memory-leak',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'Cache without size limits or eviction policy',
          impact: 'Unbounded cache can grow indefinitely',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 6: Detached DOM references (for frontend)
    if (content.includes('document.') || content.includes('querySelector')) {
      const domRefPattern = /(const|let|var)\s+\w+\s*=\s*document\./g;

      while ((match = domRefPattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index);
        const varName = match[0].match(/\s+(\w+)\s*=/)?.[1];

        if (varName) {
          const contextAfter = content.substring(match.index, match.index + 500);
          if (!contextAfter.includes(`${varName} = null`)) {
            issues.push({
              type: 'memory-leak',
              severity: 'low',
              location: `${filePath}:${lineNumber}`,
              description: `DOM reference '${varName}' not cleared`,
              impact: 'Detached DOM nodes remain in memory',
              detectedAt: new Date(),
            });
          }
        }
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
   * Suggest fixes for memory leaks
   */
  suggestFix(issue: PerformanceIssue): string {
    const suggestions = {
      'event-listener': `
// Add cleanup in component lifecycle
class MyComponent implements OnDestroy {
  private subscription: Subscription;

  ngOnInit() {
    this.subscription = this.service.subscribe(data => {
      // handle data
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
`,
      'timer': `
// Clear intervals on cleanup
class MyService {
  private intervalId: NodeJS.Timeout;

  startPolling() {
    this.intervalId = setInterval(() => {
      // polling logic
    }, 1000);
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
`,
      'unbounded-cache': `
// Implement LRU cache with size limits
class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  set(key: K, value: V) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
`,
    };

    return suggestions['event-listener']; // Default suggestion
  }
}
