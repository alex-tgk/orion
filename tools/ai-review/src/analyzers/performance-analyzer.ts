import Anthropic from '@anthropic-ai/sdk';
import { PerformanceConfig, FileChange, PerformanceIssue, AnalysisResult } from '../types';

export class PerformanceAnalyzer {
  private config: PerformanceConfig;
  private anthropic: Anthropic;

  constructor(config: PerformanceConfig, anthropic: Anthropic) {
    this.config = config;
    this.anthropic = anthropic;
  }

  async analyze(files: FileChange[]): Promise<AnalysisResult<PerformanceIssue>> {
    const issues: PerformanceIssue[] = [];

    for (const file of files) {
      issues.push(...this.checkComplexity(file));
      issues.push(...this.checkSynchronousBlocking(file));
      issues.push(...this.checkNestedLoops(file));
    }

    // AI-powered performance analysis
    const aiIssues = await this.aiAnalysis(files);
    issues.push(...aiIssues);

    return {
      category: 'performance',
      issues,
      summary: this.generateSummary(issues),
      metrics: this.calculateMetrics(issues),
    };
  }

  private checkComplexity(file: FileChange): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (!this.config.checks.algorithmComplexity) {
      return issues;
    }

    // Simple cyclomatic complexity estimation
    const complexity = this.estimateComplexity(file.content);

    if (complexity > this.config.thresholds.cyclomaticComplexity) {
      issues.push({
        type: 'high-complexity',
        severity: 'medium',
        file: file.filename,
        line: 1,
        message: `High cyclomatic complexity: ${complexity}`,
        detail: `Function complexity exceeds threshold of ${this.config.thresholds.cyclomaticComplexity}`,
        recommendation: 'Consider breaking down into smaller functions',
        impact: 'Maintainability and performance',
      });
    }

    return issues;
  }

  private checkSynchronousBlocking(file: FileChange): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (!this.config.patterns.synchronousBlocking.enabled) {
      return issues;
    }

    for (const pattern of this.config.patterns.synchronousBlocking.patterns) {
      const regex = new RegExp(pattern, 'g');
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        issues.push({
          type: 'blocking-operation',
          severity: 'high',
          file: file.filename,
          line: this.getLineNumber(file.content, match.index || 0),
          message: 'Synchronous blocking operation detected',
          detail: `Found blocking call: ${match[0]}`,
          recommendation: 'Use async/await or Promise-based alternatives',
          impact: 'Event loop blocking, poor concurrency',
        });
      }
    }

    return issues;
  }

  private checkNestedLoops(file: FileChange): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    if (!this.config.checks.inefficientLoops) {
      return issues;
    }

    const nestedLoopPattern = /(for|while)\s*\([^)]*\)\s*\{[^}]*?(for|while)\s*\([^)]*\)\s*\{[^}]*?(for|while)/g;
    const matches = file.content.matchAll(nestedLoopPattern);

    for (const match of matches) {
      issues.push({
        type: 'nested-loops',
        severity: 'medium',
        file: file.filename,
        line: this.getLineNumber(file.content, match.index || 0),
        message: 'Deep loop nesting detected',
        detail: 'Nested loops can lead to O(n²) or worse complexity',
        recommendation: 'Consider using maps, sets, or more efficient algorithms',
        impact: 'Poor performance with large datasets',
      });
    }

    return issues;
  }

  private async aiAnalysis(files: FileChange[]): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    for (const file of files) {
      if (this.shouldAnalyzeFile(file)) {
        const prompt = this.buildPerformancePrompt(file);

        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
        issues.push(...this.parseAiResponse(responseText));
      }
    }

    return issues;
  }

  private buildPerformancePrompt(file: FileChange): string {
    return `Analyze this code for performance issues. Focus on:
- Algorithm complexity (O(n²), O(n³), etc.)
- Memory leaks and excessive allocations
- N+1 query problems
- Inefficient data structures
- Unnecessary re-renders (React)
- Database query optimization
- Caching opportunities

File: ${file.filename}
Code:
\`\`\`${this.getFileExtension(file.filename)}
${file.content.substring(0, 3000)}
\`\`\`

Return findings as JSON array:
[
  {
    "type": "issue-type",
    "severity": "critical|high|medium|low",
    "file": "${file.filename}",
    "line": number,
    "message": "brief message",
    "detail": "detailed explanation",
    "recommendation": "optimization suggestion",
    "impact": "performance impact description"
  }
]`;
  }

  private parseAiResponse(response: string): PerformanceIssue[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing AI performance response:', error);
      return [];
    }
  }

  private estimateComplexity(content: string): number {
    // Simple estimation based on control flow statements
    const patterns = [/\bif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcase\b/g, /\bcatch\b/g, /\b&&\b/g, /\b\|\|\b/g];

    let complexity = 1;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      complexity += matches ? matches.length : 0;
    }

    return complexity;
  }

  private shouldAnalyzeFile(file: FileChange): boolean {
    // Analyze TypeScript/JavaScript files
    return /\.(ts|tsx|js|jsx)$/.test(file.filename);
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop() || '';
    return ext === 'ts' || ext === 'tsx' ? 'typescript' : ext;
  }

  private generateSummary(issues: PerformanceIssue[]): string {
    const highImpact = issues.filter((i) => i.severity === 'high' || i.severity === 'critical').length;
    return `Found ${issues.length} performance issues, ${highImpact} with high impact`;
  }

  private calculateMetrics(issues: PerformanceIssue[]): Record<string, any> {
    const severityCounts = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalIssues: issues.length,
      bySeverity: severityCounts,
      estimatedImpact: this.calculateImpactScore(issues),
    };
  }

  private calculateImpactScore(issues: PerformanceIssue[]): string {
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const highCount = issues.filter((i) => i.severity === 'high').length;

    if (criticalCount > 0) return 'severe';
    if (highCount > 2) return 'significant';
    if (highCount > 0) return 'moderate';
    return 'minimal';
  }
}
