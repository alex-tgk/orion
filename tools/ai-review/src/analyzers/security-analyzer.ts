import Anthropic from '@anthropic-ai/sdk';
import { SecurityConfig, FileChange, SecurityIssue, AnalysisResult } from '../types';

export class SecurityAnalyzer {
  private config: SecurityConfig;
  private anthropic: Anthropic;

  constructor(config: SecurityConfig, anthropic: Anthropic) {
    this.config = config;
    this.anthropic = anthropic;
  }

  async analyze(files: FileChange[]): Promise<AnalysisResult<SecurityIssue>> {
    const issues: SecurityIssue[] = [];

    // Run pattern-based checks
    for (const file of files) {
      issues.push(...this.checkSecrets(file));
      issues.push(...this.checkSqlInjection(file));
      issues.push(...this.checkXss(file));
    }

    // Run AI-powered analysis
    const aiIssues = await this.aiAnalysis(files);
    issues.push(...aiIssues);

    return {
      category: 'security',
      issues,
      summary: this.generateSummary(issues),
      metrics: this.calculateMetrics(issues),
    };
  }

  private checkSecrets(file: FileChange): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const { patterns } = this.config.patterns.secrets;

    if (!this.config.patterns.secrets.enabled) {
      return issues;
    }

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'g');
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        issues.push({
          type: 'hardcoded-secrets',
          severity: 'critical',
          file: file.filename,
          line: this.getLineNumber(file.content, match.index || 0),
          message: 'Potential hardcoded secret detected',
          detail: `Found pattern that matches secret: ${match[0].substring(0, 50)}...`,
          recommendation: 'Use environment variables or secret management service',
          cwe: 'CWE-798',
        });
      }
    }

    return issues;
  }

  private checkSqlInjection(file: FileChange): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const { patterns } = this.config.patterns.sqlInjection;

    if (!this.config.patterns.sqlInjection.enabled) {
      return issues;
    }

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        issues.push({
          type: 'sql-injection',
          severity: 'critical',
          file: file.filename,
          line: this.getLineNumber(file.content, match.index || 0),
          message: 'Potential SQL injection vulnerability',
          detail: `Unsafe SQL query construction detected: ${match[0]}`,
          recommendation: 'Use parameterized queries or ORM with proper escaping',
          cwe: 'CWE-89',
        });
      }
    }

    return issues;
  }

  private checkXss(file: FileChange): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const { patterns } = this.config.patterns.xss;

    if (!this.config.patterns.xss.enabled) {
      return issues;
    }

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'g');
      const matches = file.content.matchAll(regex);

      for (const match of matches) {
        issues.push({
          type: 'xss',
          severity: 'high',
          file: file.filename,
          line: this.getLineNumber(file.content, match.index || 0),
          message: 'Potential XSS vulnerability',
          detail: `Unsafe DOM manipulation detected: ${match[0]}`,
          recommendation: 'Sanitize user input and use safe DOM manipulation methods',
          cwe: 'CWE-79',
        });
      }
    }

    return issues;
  }

  private async aiAnalysis(files: FileChange[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    // Batch files for AI analysis
    const batches = this.batchFiles(files, 5);

    for (const batch of batches) {
      const prompt = this.buildSecurityPrompt(batch);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
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

    return issues;
  }

  private buildSecurityPrompt(files: FileChange[]): string {
    return `Analyze the following code changes for security vulnerabilities. Focus on:
- Authentication and authorization issues
- Input validation problems
- Cryptographic weaknesses
- Insecure configurations
- OWASP Top 10 vulnerabilities
- API security issues

Files to analyze:
${files.map((f) => `
File: ${f.filename}
Changes:
\`\`\`${this.getFileExtension(f.filename)}
${f.patch || f.content.substring(0, 2000)}
\`\`\`
`).join('\n')}

Return findings as JSON array:
[
  {
    "type": "vulnerability-type",
    "severity": "critical|high|medium|low",
    "file": "filename",
    "line": number,
    "message": "brief message",
    "detail": "detailed explanation",
    "recommendation": "how to fix",
    "cwe": "CWE-XXX"
  }
]`;
  }

  private parseAiResponse(response: string): SecurityIssue[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error parsing AI security response:', error);
      return [];
    }
  }

  private batchFiles(files: FileChange[], batchSize: number): FileChange[][] {
    const batches: FileChange[][] = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop() || '';
    return ext === 'ts' || ext === 'tsx' ? 'typescript' : ext;
  }

  private generateSummary(issues: SecurityIssue[]): string {
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const highCount = issues.filter((i) => i.severity === 'high').length;
    const mediumCount = issues.filter((i) => i.severity === 'medium').length;

    return `Found ${issues.length} security issues: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium`;
  }

  private calculateMetrics(issues: SecurityIssue[]): Record<string, any> {
    const severityCounts = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const securityScore = Math.max(
      0,
      100 - (severityCounts.critical || 0) * 25 - (severityCounts.high || 0) * 10 - (severityCounts.medium || 0) * 5
    );

    return {
      totalIssues: issues.length,
      bySeverity: severityCounts,
      securityScore,
      criticalThresholdExceeded: (severityCounts.critical || 0) > this.config.thresholds.critical,
    };
  }
}
