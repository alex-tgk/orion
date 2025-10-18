/**
 * Algorithm Detector
 *
 * Detects inefficient algorithms and suggests optimizations
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import type { PerformanceIssue } from '../analyzer';

export class AlgorithmDetector {
  /**
   * Detect inefficient algorithms
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
   * Analyze file for inefficient algorithms
   */
  private async analyzeFile(filePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const content = await readFile(filePath, 'utf-8');

    // Pattern 1: Nested loops (O(n²) or worse)
    const nestedLoopPattern = /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)\s*\{/g;
    let match;

    while ((match = nestedLoopPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const loopContent = this.extractBlock(content, match.index);

      // Check if it's actually O(n²) and not intentional
      if (!loopContent.includes('matrix') && !loopContent.includes('grid')) {
        issues.push({
          type: 'slow-algorithm',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'Nested loops detected - potential O(n²) complexity',
          impact: 'Performance degrades quadratically with input size',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 2: Linear search in loop (should use Map/Set)
    const linearSearchPattern = /for\s*\([^)]+\)\s*\{[^}]*\.find\([^)]+\)/g;

    while ((match = linearSearchPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      issues.push({
        type: 'slow-algorithm',
        severity: 'high',
        location: `${filePath}:${lineNumber}`,
        description: 'Using array.find() in a loop - O(n²) complexity',
        impact: 'Consider using Map or Set for O(1) lookups',
        detectedAt: new Date(),
      });
    }

    // Pattern 3: Inefficient string concatenation
    const stringConcatPattern = /for\s*\([^)]+\)\s*\{[^}]*\+=/g;

    while ((match = stringConcatPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const loopContent = this.extractBlock(content, match.index);

      if (loopContent.match(/string.*\+=/)) {
        issues.push({
          type: 'slow-algorithm',
          severity: 'low',
          location: `${filePath}:${lineNumber}`,
          description: 'String concatenation in loop',
          impact: 'Use array.join() or string builder for better performance',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 4: Repeated array sorting
    const sortInLoopPattern = /for\s*\([^)]+\)\s*\{[^}]*\.sort\(/g;

    while ((match = sortInLoopPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      issues.push({
        type: 'slow-algorithm',
        severity: 'high',
        location: `${filePath}:${lineNumber}`,
        description: 'Array sorting inside loop',
        impact: 'Sort once outside the loop. Current complexity: O(n² log n)',
        detectedAt: new Date(),
      });
    }

    // Pattern 5: Inefficient filtering
    const multipleFilterPattern = /\.filter\([^)]+\)\.filter\([^)]+\)/g;

    while ((match = multipleFilterPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      issues.push({
        type: 'slow-algorithm',
        severity: 'low',
        location: `${filePath}:${lineNumber}`,
        description: 'Multiple sequential filters',
        impact: 'Combine filters into single pass for better performance',
        detectedAt: new Date(),
      });
    }

    // Pattern 6: indexOf in conditional (should use includes/has)
    const indexOfPattern = /if\s*\([^)]*\.indexOf\([^)]+\)\s*[>!]=\s*-1/g;

    while ((match = indexOfPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);

      issues.push({
        type: 'slow-algorithm',
        severity: 'low',
        location: `${filePath}:${lineNumber}`,
        description: 'Using indexOf for existence check',
        impact: 'Use includes() or Set.has() for better readability and performance',
        detectedAt: new Date(),
      });
    }

    // Pattern 7: Recursive without memoization
    const recursivePattern = /function\s+(\w+)[^{]*\{[^}]*\1\(/g;

    while ((match = recursivePattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const functionContent = this.extractBlock(content, match.index);

      if (!functionContent.includes('memo') && !functionContent.includes('cache')) {
        issues.push({
          type: 'slow-algorithm',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'Recursive function without memoization',
          impact: 'Consider adding memoization for overlapping subproblems',
          detectedAt: new Date(),
        });
      }
    }

    // Pattern 8: Array operations in tight loops
    const arrayOpsInLoopPattern = /for\s*\([^)]+\)\s*\{[^}]*(?:push|unshift|splice)\(/g;

    while ((match = arrayOpsInLoopPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const loopContent = this.extractBlock(content, match.index);

      if (loopContent.includes('unshift')) {
        issues.push({
          type: 'slow-algorithm',
          severity: 'medium',
          location: `${filePath}:${lineNumber}`,
          description: 'Using unshift() in loop - O(n²) complexity',
          impact: 'Use push() and reverse() instead, or use a linked list',
          detectedAt: new Date(),
        });
      }
    }

    return issues;
  }

  /**
   * Extract code block
   */
  private extractBlock(content: string, startIndex: number): string {
    let braceCount = 0;
    let inBlock = false;
    let result = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        braceCount++;
        inBlock = true;
      } else if (char === '}') {
        braceCount--;
      }

      result += char;

      if (inBlock && braceCount === 0) {
        break;
      }
    }

    return result;
  }

  /**
   * Get line number from string index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Suggest algorithm optimization
   */
  suggestOptimization(issue: PerformanceIssue): string {
    const suggestions = {
      'nested-loop': `
// Instead of O(n²):
for (const item1 of array1) {
  for (const item2 of array2) {
    if (item1.id === item2.id) {
      // match found
    }
  }
}

// Use Map for O(n):
const map = new Map(array2.map(item => [item.id, item]));
for (const item1 of array1) {
  const match = map.get(item1.id);
  if (match) {
    // match found
  }
}
`,
      'find-in-loop': `
// Instead of:
for (const item of items) {
  const user = users.find(u => u.id === item.userId); // O(n²)
}

// Use:
const userMap = new Map(users.map(u => [u.id, u]));
for (const item of items) {
  const user = userMap.get(item.userId); // O(n)
}
`,
      'recursive-memoization': `
// Add memoization:
const memo = new Map();

function fibonacci(n: number): number {
  if (n <= 1) return n;

  if (memo.has(n)) {
    return memo.get(n)!;
  }

  const result = fibonacci(n - 1) + fibonacci(n - 2);
  memo.set(n, result);
  return result;
}
`,
    };

    return suggestions['nested-loop']; // Default suggestion
  }
}
