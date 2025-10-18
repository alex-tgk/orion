import Anthropic from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ReviewConfig, ReviewResult, FileChange, AnalysisResult } from '../types';
import { SecurityAnalyzer } from '../analyzers/security-analyzer';
import { PerformanceAnalyzer } from '../analyzers/performance-analyzer';
import { QualityAnalyzer } from '../analyzers/quality-analyzer';
import { TestAnalyzer } from '../analyzers/test-analyzer';
import { DocumentationAnalyzer } from '../analyzers/documentation-analyzer';
import { LearningEngine } from './learning-engine';
import { MetricsCollector } from '../utils/metrics-collector';

const readFile = promisify(fs.readFile);

export class ReviewEngine {
  private anthropic: Anthropic;
  private octokit: Octokit;
  private config: ReviewConfig;
  private securityAnalyzer: SecurityAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private qualityAnalyzer: QualityAnalyzer;
  private testAnalyzer: TestAnalyzer;
  private documentationAnalyzer: DocumentationAnalyzer;
  private learningEngine: LearningEngine;
  private metricsCollector: MetricsCollector;

  constructor(config: ReviewConfig) {
    this.config = config;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Initialize analyzers
    this.securityAnalyzer = new SecurityAnalyzer(config.analyzers.security, this.anthropic);
    this.performanceAnalyzer = new PerformanceAnalyzer(config.analyzers.performance, this.anthropic);
    this.qualityAnalyzer = new QualityAnalyzer(config.analyzers.quality, this.anthropic);
    this.testAnalyzer = new TestAnalyzer(config.analyzers.test, this.anthropic);
    this.documentationAnalyzer = new DocumentationAnalyzer(config.analyzers.documentation, this.anthropic);
    this.learningEngine = new LearningEngine(config.review.learning);
    this.metricsCollector = new MetricsCollector(config.metrics);
  }

  /**
   * Perform comprehensive code review on PR
   */
  async reviewPullRequest(prNumber: number, owner: string, repo: string): Promise<ReviewResult> {
    const startTime = Date.now();

    try {
      // Get PR details and file changes
      const pr = await this.octokit.pulls.get({ owner, repo, pull_number: prNumber });
      const files = await this.getPRFiles(prNumber, owner, repo);

      // Run all analyzers in parallel
      const [securityResults, performanceResults, qualityResults, testResults, documentationResults] = await Promise.all([
        this.securityAnalyzer.analyze(files),
        this.performanceAnalyzer.analyze(files),
        this.qualityAnalyzer.analyze(files),
        this.testAnalyzer.analyze(files),
        this.documentationAnalyzer.analyze(files),
      ]);

      // Generate comprehensive review
      const review = await this.generateComprehensiveReview({
        pr,
        files,
        security: securityResults,
        performance: performanceResults,
        quality: qualityResults,
        test: testResults,
        documentation: documentationResults,
      });

      // Apply learning from previous reviews
      const enhancedReview = await this.learningEngine.enhance(review);

      // Collect metrics
      await this.metricsCollector.record({
        prNumber,
        reviewTime: Date.now() - startTime,
        issuesFound: enhancedReview.issues.length,
        severity: this.calculateSeverityDistribution(enhancedReview),
      });

      return enhancedReview;
    } catch (error) {
      console.error('Error during review:', error);
      throw error;
    }
  }

  /**
   * Get all file changes from a PR
   */
  private async getPRFiles(prNumber: number, owner: string, repo: string): Promise<FileChange[]> {
    const { data: files } = await this.octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    const fileChanges: FileChange[] = [];

    for (const file of files) {
      // Skip excluded files
      if (this.shouldExclude(file.filename)) {
        continue;
      }

      const content = await this.getFileContent(owner, repo, file.filename, file.sha);

      fileChanges.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch || '',
        content,
        sha: file.sha,
      });
    }

    return fileChanges;
  }

  /**
   * Get file content from GitHub
   */
  private async getFileContent(owner: string, repo: string, path: string, sha: string): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: sha,
      });

      if ('content' in data) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return '';
    } catch (error) {
      console.error(`Error fetching content for ${path}:`, error);
      return '';
    }
  }

  /**
   * Check if file should be excluded from review
   */
  private shouldExclude(filename: string): boolean {
    const { exclusions } = this.config;

    // Check file patterns
    for (const pattern of exclusions.files) {
      if (filename.match(new RegExp(pattern))) {
        return true;
      }
    }

    // Check exclusion patterns
    for (const pattern of exclusions.patterns) {
      if (filename.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate comprehensive review using Claude
   */
  private async generateComprehensiveReview(data: any): Promise<ReviewResult> {
    const prompt = this.buildReviewPrompt(data);

    const response = await this.anthropic.messages.create({
      model: this.config.review.model,
      max_tokens: this.config.review.maxTokens,
      temperature: this.config.review.temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const reviewText = response.content[0].type === 'text' ? response.content[0].text : '';

    return this.parseReviewResponse(reviewText, data);
  }

  /**
   * Build comprehensive review prompt
   */
  private buildReviewPrompt(data: any): string {
    return `You are an expert code reviewer for the ORION microservices platform. Analyze the following pull request and provide a comprehensive review.

PR Information:
- Title: ${data.pr.data.title}
- Description: ${data.pr.data.body || 'No description provided'}
- Files Changed: ${data.files.length}
- Author: ${data.pr.data.user.login}

Analysis Results:

SECURITY ANALYSIS:
${JSON.stringify(data.security, null, 2)}

PERFORMANCE ANALYSIS:
${JSON.stringify(data.performance, null, 2)}

QUALITY ANALYSIS:
${JSON.stringify(data.quality, null, 2)}

TEST ANALYSIS:
${JSON.stringify(data.test, null, 2)}

DOCUMENTATION ANALYSIS:
${JSON.stringify(data.documentation, null, 2)}

File Changes:
${data.files.map((f: FileChange) => `
File: ${f.filename}
Status: ${f.status}
Changes: +${f.additions} -${f.deletions}
Patch:
\`\`\`diff
${f.patch}
\`\`\`
`).join('\n')}

Please provide a comprehensive code review including:
1. Critical issues that must be fixed before merging
2. High-priority improvements
3. Medium-priority suggestions
4. Low-priority enhancements
5. Positive feedback on good practices
6. Specific fix suggestions with code examples
7. Overall assessment and recommendation (APPROVE, REQUEST_CHANGES, COMMENT)

Format your response as JSON with the following structure:
{
  "summary": "Overall review summary",
  "recommendation": "APPROVE|REQUEST_CHANGES|COMMENT",
  "issues": [
    {
      "file": "filename",
      "line": number,
      "severity": "critical|high|medium|low|info",
      "category": "security|performance|quality|test|documentation",
      "title": "Issue title",
      "description": "Detailed description",
      "suggestion": "Fix suggestion",
      "autoFixable": boolean,
      "autoFix": "code to apply if autoFixable"
    }
  ],
  "positives": ["positive feedback points"],
  "metrics": {
    "complexity": number,
    "maintainability": number,
    "security": number,
    "testCoverage": number
  }
}`;
  }

  /**
   * Parse Claude's review response
   */
  private parseReviewResponse(reviewText: string, data: any): ReviewResult {
    try {
      // Extract JSON from response
      const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in review response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary,
        recommendation: parsed.recommendation,
        issues: parsed.issues || [],
        positives: parsed.positives || [],
        metrics: parsed.metrics || {},
        timestamp: new Date().toISOString(),
        prNumber: data.pr.data.number,
        analyzers: {
          security: data.security,
          performance: data.performance,
          quality: data.quality,
          test: data.test,
          documentation: data.documentation,
        },
      };
    } catch (error) {
      console.error('Error parsing review response:', error);
      throw error;
    }
  }

  /**
   * Calculate severity distribution
   */
  private calculateSeverityDistribution(review: ReviewResult): Record<string, number> {
    const distribution: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const issue of review.issues) {
      distribution[issue.severity] = (distribution[issue.severity] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Post review comments to GitHub PR
   */
  async postReview(prNumber: number, owner: string, repo: string, review: ReviewResult): Promise<void> {
    // Post summary comment
    if (this.config.github.postSummary) {
      await this.octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: this.formatReviewSummary(review),
      });
    }

    // Post inline comments
    if (this.config.github.postComments) {
      await this.postInlineComments(prNumber, owner, repo, review);
    }

    // Add labels
    if (this.config.github.addLabels) {
      await this.addReviewLabels(prNumber, owner, repo, review);
    }
  }

  /**
   * Format review summary for GitHub comment
   */
  private formatReviewSummary(review: ReviewResult): string {
    const criticalCount = review.issues.filter((i) => i.severity === 'critical').length;
    const highCount = review.issues.filter((i) => i.severity === 'high').length;
    const mediumCount = review.issues.filter((i) => i.severity === 'medium').length;
    const lowCount = review.issues.filter((i) => i.severity === 'low').length;

    return `## 🤖 AI Code Review Summary

${review.summary}

### Issues Found
- 🚨 Critical: ${criticalCount}
- ⚠️ High: ${highCount}
- 💡 Medium: ${mediumCount}
- 📝 Low: ${lowCount}

### Recommendation
**${review.recommendation}**

### Metrics
- Complexity: ${review.metrics.complexity}/100
- Maintainability: ${review.metrics.maintainability}/100
- Security: ${review.metrics.security}/100
- Test Coverage: ${review.metrics.testCoverage}%

### Positive Feedback
${review.positives.map((p) => `- ✅ ${p}`).join('\n')}

---
*Generated by AI Code Review Engine • Powered by Claude*`;
  }

  /**
   * Post inline comments on PR files
   */
  private async postInlineComments(prNumber: number, owner: string, repo: string, review: ReviewResult): Promise<void> {
    const comments = review.issues
      .filter((issue) => issue.line && this.config.github.commentStyle === 'inline')
      .slice(0, this.config.github.maxCommentsPerFile * 10); // Limit total comments

    if (this.config.github.batchComments) {
      // Create review with all comments
      const reviewComments = comments.map((issue) => ({
        path: issue.file,
        line: issue.line!,
        body: this.formatInlineComment(issue),
      }));

      await this.octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        event: 'COMMENT',
        comments: reviewComments,
      });
    } else {
      // Post individual comments
      for (const issue of comments) {
        await this.octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          path: issue.file,
          line: issue.line!,
          body: this.formatInlineComment(issue),
        });
      }
    }
  }

  /**
   * Format inline comment
   */
  private formatInlineComment(issue: any): string {
    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '💡',
      low: '📝',
      info: 'ℹ️',
    };

    let comment = `${severityEmoji[issue.severity as keyof typeof severityEmoji]} **${issue.title}**\n\n`;
    comment += `${issue.description}\n\n`;

    if (issue.suggestion) {
      comment += `**Suggestion:**\n${issue.suggestion}\n\n`;
    }

    if (issue.autoFixable && issue.autoFix) {
      comment += `**Auto-fix available:**\n\`\`\`typescript\n${issue.autoFix}\n\`\`\`\n\n`;
    }

    comment += `*Category: ${issue.category} | Severity: ${issue.severity}*`;

    return comment;
  }

  /**
   * Add labels to PR based on review results
   */
  private async addReviewLabels(prNumber: number, owner: string, repo: string, review: ReviewResult): Promise<void> {
    const labels: string[] = [];

    const criticalCount = review.issues.filter((i) => i.severity === 'critical').length;
    const highCount = review.issues.filter((i) => i.severity === 'high').length;
    const mediumCount = review.issues.filter((i) => i.severity === 'medium').length;

    if (criticalCount > 0) {
      labels.push(this.config.github.labels.critical);
    } else if (highCount > 0) {
      labels.push(this.config.github.labels.high);
    } else if (mediumCount > 0) {
      labels.push(this.config.github.labels.medium);
    } else {
      labels.push(this.config.github.labels.low);
    }

    if (labels.length > 0) {
      await this.octokit.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels,
      });
    }
  }
}
