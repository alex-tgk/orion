import Anthropic from '@anthropic-ai/sdk';
import { QualityConfig, FileChange, QualityIssue, AnalysisResult } from '../types';

export class QualityAnalyzer {
  private config: QualityConfig;
  private anthropic: Anthropic;

  constructor(config: QualityConfig, anthropic: Anthropic) {
    this.config = config;
    this.anthropic = anthropic;
  }

  async analyze(files: FileChange[]): Promise<AnalysisResult<QualityIssue>> {
    const issues: QualityIssue[] = [];

    for (const file of files) {
      issues.push(...this.checkCodeSmells(file));
      issues.push(...this.checkBestPractices(file));
    }

    // AI-powered quality analysis
    const aiIssues = await this.aiAnalysis(files);
    issues.push(...aiIssues);

    return {
      category: 'quality',
      issues,
      summary: this.generateSummary(issues),
      metrics: this.calculateMetrics(issues, files),
    };
  }

  private checkCodeSmells(file: FileChange): QualityIssue[] {
    const issues: QualityIssue[] = [];

    if (!this.config.checks.codeSmells) {
      return issues;
    }

    for (const smell of this.config.patterns.codeSmells) {
      const regex = new RegExp(smell.pattern, 'g');
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        issues.push({
          type: smell.name,
          severity: smell.severity as 'low' | 'medium' | 'high',
          file: file.filename,
          line: this.getLineNumber(file.content, match.index || 0),
          message: `Code smell detected: ${smell.name}`,
          detail: `Pattern matched: ${match[0].substring(0, 100)}`,
          recommendation: this.getSmellRecommendation(smell.name),
          category: 'code-smell',
        });
      }
    }

    return issues;
  }

  private checkBestPractices(file: FileChange): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for async functions without try-catch
    if (file.content.includes('async ') && !file.content.includes('try {')) {
      const asyncPattern = /async\s+\w+\s*\([^)]*\)\s*\{/g;
      const matches = file.content.matchAll(asyncPattern);

      for (const match of matches) {
        const functionBody = this.extractFunctionBody(file.content, match.index || 0);
        if (!functionBody.includes('try {')) {
          issues.push({
            type: 'missing-error-handling',
            severity: 'medium',
            file: file.filename,
            line: this.getLineNumber(file.content, match.index || 0),
            message: 'Async function without error handling',
            detail: 'Async functions should have try-catch blocks',
            recommendation: 'Wrap async code in try-catch for proper error handling',
            category: 'best-practice',
          });
        }
      }
    }

    return issues;
  }

  private async aiAnalysis(files: FileChange[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];

    for (const file of files) {
      if (this.shouldAnalyzeFile(file)) {
        const prompt = this.buildQualityPrompt(file);

        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: 0.3,
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

  private buildQualityPrompt(file: FileChange): string {
    return `Analyze this code for quality issues. Focus on:
- Code maintainability
- Readability and clarity
- Naming conventions
- Code duplication
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- SOLID principles
- Design patterns usage
- Error handling completeness

File: ${file.filename}
Code:
\`\`\`${this.getFileExtension(file.filename)}
${file.content.substring(0, 3000)}
\`\`\`

Return findings as JSON array:
[
  {
    "type": "issue-type",
    "severity": "high|medium|low",
    "file": "${file.filename}",
    "line": number,
    "message": "brief message",
    "detail": "detailed explanation",
    "recommendation": "improvement suggestion",
    "category": "maintainability|readability|architecture"
  }
]`;
  }

  private parseAiResponse(response: string): QualityIssue[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing AI quality response:', error);
      return [];
    }
  }

  private getSmellRecommendation(smellName: string): string {
    const recommendations: Record<string, string> = {
      'large-function': 'Break down into smaller, focused functions',
      'deep-nesting': 'Reduce nesting depth using early returns or helper functions',
      'magic-numbers': 'Extract numbers into named constants',
      'console-log': 'Remove console.log statements or use proper logging',
    };

    return recommendations[smellName] || 'Follow coding best practices';
  }

  private extractFunctionBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let inFunction = false;
    let result = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        inFunction = true;
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inFunction) {
          return result;
        }
      }

      if (inFunction) {
        result += char;
      }
    }

    return result;
  }

  private shouldAnalyzeFile(file: FileChange): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(file.filename);
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop() || '';
    return ext === 'ts' || ext === 'tsx' ? 'typescript' : ext;
  }

  private generateSummary(issues: QualityIssue[]): string {
    return `Found ${issues.length} code quality issues`;
  }

  private calculateMetrics(issues: QualityIssue[], files: FileChange[]): Record<string, any> {
    const severityCounts = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate maintainability index (simplified)
    const avgComplexity = this.calculateAverageComplexity(files);
    const maintainabilityIndex = Math.max(0, 100 - avgComplexity * 2 - issues.length);

    return {
      totalIssues: issues.length,
      bySeverity: severityCounts,
      maintainabilityIndex,
      averageComplexity: avgComplexity,
    };
  }

  private calculateAverageComplexity(files: FileChange[]): number {
    let totalComplexity = 0;
    let fileCount = 0;

    for (const file of files) {
      if (this.shouldAnalyzeFile(file)) {
        totalComplexity += this.estimateComplexity(file.content);
        fileCount++;
      }
    }

    return fileCount > 0 ? Math.round(totalComplexity / fileCount) : 0;
  }

  private estimateComplexity(content: string): number {
    const patterns = [/\bif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcase\b/g, /\bcatch\b/g, /\b&&\b/g, /\b\|\|\b/g];

    let complexity = 1;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      complexity += matches ? matches.length : 0;
    }

    return complexity;
  }
}
