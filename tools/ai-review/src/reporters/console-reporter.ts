import { ReviewResult } from '../types';
import chalk from 'chalk';

export class ConsoleReporter {
  generate(review: ReviewResult): string {
    let output = '';

    output += chalk.bold.cyan('\n🤖 AI Code Review Report\n');
    output += chalk.gray('='.repeat(60)) + '\n\n';

    // Summary
    output += chalk.bold('Summary:\n');
    output += `${review.summary}\n\n`;

    // Recommendation
    output += chalk.bold('Recommendation: ');
    output += this.colorizeRecommendation(review.recommendation) + '\n\n';

    // Issues
    const severityCounts = this.countBySeverity(review.issues);
    output += chalk.bold('Issues Found:\n');
    output += `  ${chalk.red('🚨 Critical:')} ${severityCounts.critical}\n`;
    output += `  ${chalk.yellow('⚠️  High:')} ${severityCounts.high}\n`;
    output += `  ${chalk.blue('💡 Medium:')} ${severityCounts.medium}\n`;
    output += `  ${chalk.gray('📝 Low:')} ${severityCounts.low}\n\n`;

    // Metrics
    if (review.metrics) {
      output += chalk.bold('Metrics:\n');
      if (review.metrics.complexity !== undefined) {
        output += `  Complexity: ${this.colorizeScore(review.metrics.complexity)}/100\n`;
      }
      if (review.metrics.maintainability !== undefined) {
        output += `  Maintainability: ${this.colorizeScore(review.metrics.maintainability)}/100\n`;
      }
      if (review.metrics.security !== undefined) {
        output += `  Security: ${this.colorizeScore(review.metrics.security)}/100\n`;
      }
      if (review.metrics.testCoverage !== undefined) {
        output += `  Test Coverage: ${this.colorizeScore(review.metrics.testCoverage)}%\n`;
      }
      output += '\n';
    }

    // Top issues
    if (review.issues.length > 0) {
      output += chalk.bold('Top Issues:\n');
      const topIssues = review.issues
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .slice(0, 5);

      for (const issue of topIssues) {
        output += this.formatIssue(issue);
      }
      output += '\n';
    }

    // Positive feedback
    if (review.positives && review.positives.length > 0) {
      output += chalk.bold.green('✅ Positive Feedback:\n');
      for (const positive of review.positives.slice(0, 3)) {
        output += chalk.green(`  • ${positive}\n`);
      }
      output += '\n';
    }

    output += chalk.gray('─'.repeat(60)) + '\n';
    output += chalk.gray(`Generated at ${review.timestamp}\n`);

    return output;
  }

  private colorizeRecommendation(recommendation: string): string {
    switch (recommendation) {
      case 'APPROVE':
        return chalk.green('✅ APPROVE');
      case 'REQUEST_CHANGES':
        return chalk.red('🔴 REQUEST CHANGES');
      case 'COMMENT':
        return chalk.yellow('💬 COMMENT');
      default:
        return chalk.gray(recommendation);
    }
  }

  private colorizeScore(score: number): string {
    if (score >= 80) {
      return chalk.green(score.toString());
    } else if (score >= 60) {
      return chalk.yellow(score.toString());
    } else {
      return chalk.red(score.toString());
    }
  }

  private countBySeverity(issues: any[]): Record<string, number> {
    return issues.reduce(
      (acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    );
  }

  private formatIssue(issue: any): string {
    const icon = this.getSeverityIcon(issue.severity);
    let output = `  ${icon} ${chalk.bold(issue.title || issue.type)}\n`;
    output += `     File: ${chalk.cyan(issue.file)}`;
    if (issue.line) {
      output += chalk.gray(`:${issue.line}`);
    }
    output += '\n';
    output += `     ${issue.detail.substring(0, 80)}...\n\n`;
    return output;
  }

  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: chalk.red('🚨'),
      high: chalk.yellow('⚠️'),
      medium: chalk.blue('💡'),
      low: chalk.gray('📝'),
      info: chalk.cyan('ℹ️'),
    };
    return icons[severity] || '•';
  }
}
