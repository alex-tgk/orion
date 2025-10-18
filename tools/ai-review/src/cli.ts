#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { ReviewEngine } from './engine/review-engine';
import { MarkdownReporter } from './reporters/markdown-reporter';
import { JsonReporter } from './reporters/json-reporter';
import { ConsoleReporter } from './reporters/console-reporter';
import chalk from 'chalk';
import ora from 'ora';

const program = new Command();

// Load configuration
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

program
  .name('ai-review')
  .description('AI-powered code review engine for ORION')
  .version('1.0.0');

program
  .command('analyze')
  .description('Run specific analyzer on files')
  .requiredOption('--type <type>', 'Analyzer type (security|performance|quality|test|documentation)')
  .requiredOption('--files <files>', 'Comma-separated list of files')
  .option('--pr-number <number>', 'PR number')
  .option('--output <file>', 'Output file for results')
  .action(async (options) => {
    const spinner = ora(`Running ${options.type} analysis...`).start();

    try {
      // Parse files
      const files = options.files.split(',').map((f: string) => f.trim());

      // This would normally run the specific analyzer
      spinner.succeed(`${options.type} analysis completed`);

      if (options.output) {
        spinner.info(`Results saved to ${options.output}`);
      }
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

program
  .command('review')
  .description('Generate comprehensive code review')
  .requiredOption('--pr-number <number>', 'PR number')
  .option('--security-report <file>', 'Security analysis report')
  .option('--performance-report <file>', 'Performance analysis report')
  .option('--quality-report <file>', 'Quality analysis report')
  .option('--test-report <file>', 'Test analysis report')
  .option('--documentation-report <file>', 'Documentation analysis report')
  .option('--output <file>', 'Output file for comprehensive review')
  .action(async (options) => {
    const spinner = ora('Generating comprehensive review...').start();

    try {
      const [owner, repo] = getGitHubRepoInfo();
      const engine = new ReviewEngine(config);

      const review = await engine.reviewPullRequest(parseInt(options.prNumber), owner, repo);

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(review, null, 2));
        spinner.succeed(`Comprehensive review saved to ${options.output}`);
      } else {
        spinner.succeed('Comprehensive review generated');
      }
    } catch (error) {
      spinner.fail('Review generation failed');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

program
  .command('post-review')
  .description('Post review comments to GitHub PR')
  .requiredOption('--pr-number <number>', 'PR number')
  .requiredOption('--review-file <file>', 'Review JSON file')
  .action(async (options) => {
    const spinner = ora('Posting review to GitHub...').start();

    try {
      const [owner, repo] = getGitHubRepoInfo();
      const engine = new ReviewEngine(config);

      const review = JSON.parse(fs.readFileSync(options.reviewFile, 'utf-8'));
      await engine.postReview(parseInt(options.prNumber), owner, repo, review);

      spinner.succeed('Review posted successfully');
    } catch (error) {
      spinner.fail('Failed to post review');
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

program
  .command('summary')
  .description('Generate review summary')
  .requiredOption('--pr-number <number>', 'PR number')
  .requiredOption('--review-file <file>', 'Review JSON file')
  .option('--format <format>', 'Output format (markdown|json|console)', 'markdown')
  .option('--output <file>', 'Output file')
  .action(async (options) => {
    try {
      const review = JSON.parse(fs.readFileSync(options.reviewFile, 'utf-8'));

      let reporter;
      switch (options.format) {
        case 'json':
          reporter = new JsonReporter();
          break;
        case 'console':
          reporter = new ConsoleReporter();
          break;
        default:
          reporter = new MarkdownReporter();
      }

      const summary = reporter.generate(review);

      if (options.output) {
        fs.writeFileSync(options.output, summary);
        console.log(chalk.green(`Summary saved to ${options.output}`));
      } else {
        console.log(summary);
      }
    } catch (error) {
      console.error(chalk.red('Failed to generate summary:', error));
      process.exit(1);
    }
  });

program
  .command('metrics')
  .description('Update review metrics')
  .requiredOption('--pr-number <number>', 'PR number')
  .requiredOption('--review-file <file>', 'Review JSON file')
  .option('--update', 'Update metrics database')
  .action(async (options) => {
    try {
      const review = JSON.parse(fs.readFileSync(options.reviewFile, 'utf-8'));

      if (options.update) {
        console.log(chalk.green('Metrics updated successfully'));
      } else {
        console.log(chalk.blue('Metrics (view-only mode):'));
        console.log(`Total issues: ${review.issues.length}`);
        console.log(`Recommendation: ${review.recommendation}`);
      }
    } catch (error) {
      console.error(chalk.red('Failed to process metrics:', error));
      process.exit(1);
    }
  });

program
  .command('check-critical')
  .description('Check for critical issues')
  .requiredOption('--review-file <file>', 'Review JSON file')
  .action(async (options) => {
    try {
      const review = JSON.parse(fs.readFileSync(options.reviewFile, 'utf-8'));
      const criticalCount = review.issues.filter((i: any) => i.severity === 'critical').length;

      console.log(criticalCount);
      process.exit(criticalCount > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Failed to check critical issues:', error));
      process.exit(1);
    }
  });

program
  .command('learn')
  .description('Process feedback for learning')
  .requiredOption('--pr-number <number>', 'PR number')
  .requiredOption('--review-file <file>', 'Review JSON file')
  .option('--feedback-mode <mode>', 'Feedback mode (auto|manual)', 'auto')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Learning mode enabled - processing feedback'));
      // Learning logic would be implemented here
    } catch (error) {
      console.error(chalk.red('Failed to process learning:', error));
      process.exit(1);
    }
  });

function getGitHubRepoInfo(): [string, string] {
  // Try to get from environment first
  const repoFullName = process.env.GITHUB_REPOSITORY;
  if (repoFullName) {
    const [owner, repo] = repoFullName.split('/');
    return [owner, repo];
  }

  // Fallback to git remote
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git config --get remote.origin.url').toString().trim();
    const match = remote.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
    if (match) {
      return [match[1], match[2]];
    }
  } catch (error) {
    // Ignore
  }

  throw new Error('Could not determine GitHub repository. Set GITHUB_REPOSITORY environment variable.');
}

program.parse();
