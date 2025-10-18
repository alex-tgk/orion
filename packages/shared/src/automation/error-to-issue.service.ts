import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { AppError } from '../errors/app-error';
import {
  SeverityToLabel,
  CategoryToLabel,
} from '../errors/error-severity.enum';
import {
  GitHubIssueRequest,
  GitHubIssueResponse,
  ErrorOccurrence,
} from './github-issue.interface';
import { IssueTemplateService } from './issue-template.service';

/**
 * Configuration for Error-to-Issue Service
 */
export interface ErrorToIssueConfig {
  /**
   * GitHub Personal Access Token
   */
  githubToken: string;

  /**
   * GitHub repository in format "owner/repo"
   */
  githubRepo: string;

  /**
   * Enable/disable automatic issue creation
   */
  enabled: boolean;

  /**
   * Rate limit: maximum issues per hour
   */
  maxIssuesPerHour?: number;

  /**
   * Deduplication window in milliseconds
   */
  deduplicationWindowMs?: number;

  /**
   * Default assignees for issues
   */
  defaultAssignees?: string[];
}

/**
 * Service for converting errors to GitHub issues
 */
@Injectable()
export class ErrorToIssueService {
  private readonly logger = new Logger(ErrorToIssueService.name);
  private readonly githubClient: AxiosInstance;
  private readonly errorOccurrences = new Map<string, ErrorOccurrence>();
  private issueCreationCount = 0;
  private lastResetTime = Date.now();

  constructor(private readonly config: ErrorToIssueConfig) {
    // Initialize GitHub API client
    this.githubClient = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${config.githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Reset rate limit counter every hour
    setInterval(() => {
      this.issueCreationCount = 0;
      this.lastResetTime = Date.now();
    }, 3600000); // 1 hour
  }

  /**
   * Process error and create GitHub issue if needed
   */
  async processError(error: AppError): Promise<GitHubIssueResponse | null> {
    try {
      // Check if service is enabled
      if (!this.config.enabled) {
        this.logger.debug('Error-to-Issue service is disabled');
        return null;
      }

      // Check if error should create an issue
      if (!error.shouldCreateIssue()) {
        this.logger.debug(
          `Error ${error.code} does not meet criteria for issue creation`
        );
        return null;
      }

      // Check rate limit
      if (this.isRateLimited()) {
        this.logger.warn('Rate limit exceeded for issue creation');
        return null;
      }

      // Check for duplicate
      const occurrence = this.trackOccurrence(error);
      if (await this.isDuplicate(error, occurrence)) {
        this.logger.debug(
          `Duplicate error detected: ${error.signature}. Updating existing issue.`
        );
        await this.updateExistingIssue(occurrence, error);
        return null;
      }

      // Create new issue
      const issue = await this.createIssue(error, occurrence);

      // Store issue reference in occurrence
      if (issue) {
        occurrence.issueNumber = issue.number;
        occurrence.issueUrl = issue.html_url;
      }

      return issue;
    } catch (err) {
      this.logger.error('Failed to process error for issue creation', err);
      return null;
    }
  }

  /**
   * Create GitHub issue
   */
  private async createIssue(
    error: AppError,
    occurrence: ErrorOccurrence
  ): Promise<GitHubIssueResponse | null> {
    try {
      const issueRequest = this.buildIssueRequest(error, occurrence);

      this.logger.log(
        `Creating GitHub issue for error: ${error.code} (${error.signature})`
      );

      const response = await this.githubClient.post<GitHubIssueResponse>(
        `/repos/${this.config.githubRepo}/issues`,
        issueRequest
      );

      this.issueCreationCount++;

      this.logger.log(
        `GitHub issue created: #${response.data.number} - ${response.data.html_url}`
      );

      return response.data;
    } catch (err) {
      this.logger.error('Failed to create GitHub issue', err);
      return null;
    }
  }

  /**
   * Build GitHub issue request
   */
  private buildIssueRequest(
    error: AppError,
    occurrence: ErrorOccurrence
  ): GitHubIssueRequest {
    // Generate title
    const title = IssueTemplateService.generateTitle(error, occurrence.count);

    // Generate body
    const body = IssueTemplateService.generateBody(
      error,
      occurrence.count,
      occurrence.firstSeen,
      occurrence.lastSeen
    );

    // Generate labels
    const labels = this.generateLabels(error);

    // Get assignees
    const assignees = this.config.defaultAssignees || [];

    return {
      title,
      body,
      labels,
      assignees,
    };
  }

  /**
   * Generate labels for issue
   */
  private generateLabels(error: AppError): string[] {
    const labels: string[] = [];

    // Add severity labels
    labels.push(...SeverityToLabel[error.severity]);

    // Add category label
    labels.push(CategoryToLabel[error.category]);

    // Add service label
    labels.push(`service:${error.context.service}`);

    // Add automated label
    labels.push('automated-issue');

    return [...new Set(labels)]; // Remove duplicates
  }

  /**
   * Track error occurrence for deduplication
   */
  private trackOccurrence(error: AppError): ErrorOccurrence {
    const existing = this.errorOccurrences.get(error.signature);

    if (existing) {
      existing.count++;
      existing.lastSeen = error.context.timestamp;
      return existing;
    }

    const occurrence: ErrorOccurrence = {
      signature: error.signature,
      count: 1,
      firstSeen: error.context.timestamp,
      lastSeen: error.context.timestamp,
    };

    this.errorOccurrences.set(error.signature, occurrence);
    return occurrence;
  }

  /**
   * Check if error is a duplicate
   */
  private async isDuplicate(
    error: AppError,
    occurrence: ErrorOccurrence
  ): Promise<boolean> {
    // Check if we've seen this error before
    if (occurrence.count === 1) {
      return false;
    }

    // Check if error is within deduplication window
    const windowMs = this.config.deduplicationWindowMs || 3600000; // 1 hour default
    const timeSinceFirst =
      error.context.timestamp.getTime() - occurrence.firstSeen.getTime();

    if (timeSinceFirst > windowMs) {
      // Outside window, treat as new error
      occurrence.firstSeen = error.context.timestamp;
      occurrence.count = 1;
      occurrence.issueNumber = undefined;
      occurrence.issueUrl = undefined;
      return false;
    }

    // Check if we already created an issue for this error
    return !!occurrence.issueNumber;
  }

  /**
   * Update existing issue with new occurrence
   */
  private async updateExistingIssue(
    occurrence: ErrorOccurrence,
    error: AppError
  ): Promise<void> {
    if (!occurrence.issueNumber) {
      return;
    }

    try {
      const comment = this.buildOccurrenceComment(error, occurrence);

      await this.githubClient.post(
        `/repos/${this.config.githubRepo}/issues/${occurrence.issueNumber}/comments`,
        { body: comment }
      );

      this.logger.log(
        `Updated issue #${occurrence.issueNumber} with new occurrence`
      );
    } catch (err) {
      this.logger.error('Failed to update existing issue', err);
    }
  }

  /**
   * Build comment for new occurrence
   */
  private buildOccurrenceComment(
    error: AppError,
    occurrence: ErrorOccurrence
  ): string {
    return `## New Occurrence Detected

**Occurrence #${occurrence.count}**

- **Timestamp:** ${error.context.timestamp.toISOString()}
- **Correlation ID:** \`${error.context.correlationId || 'N/A'}\`
- **User ID:** ${error.context.userId || 'N/A'}
- **Path:** \`${error.context.path || 'N/A'}\`
- **Method:** \`${error.context.method || 'N/A'}\`

### Additional Context
\`\`\`json
${JSON.stringify(error.context.metadata, null, 2)}
\`\`\`

---

*Total occurrences since ${occurrence.firstSeen.toISOString()}: **${occurrence.count}***
`;
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
    const maxIssues = this.config.maxIssuesPerHour || 50;
    return this.issueCreationCount >= maxIssues;
  }

  /**
   * Search for existing open issues with same signature
   */
  async searchExistingIssues(
    error: AppError
  ): Promise<GitHubIssueResponse[]> {
    try {
      const query = `repo:${this.config.githubRepo} is:issue is:open label:automated-issue "${error.signature}" in:body`;

      const response = await this.githubClient.get<{
        items: GitHubIssueResponse[];
      }>('/search/issues', {
        params: { q: query },
      });

      return response.data.items;
    } catch (err) {
      this.logger.error('Failed to search for existing issues', err);
      return [];
    }
  }

  /**
   * Get statistics about error-to-issue pipeline
   */
  getStatistics() {
    return {
      enabled: this.config.enabled,
      issuesCreatedThisHour: this.issueCreationCount,
      maxIssuesPerHour: this.config.maxIssuesPerHour || 50,
      lastResetTime: new Date(this.lastResetTime).toISOString(),
      trackedErrorSignatures: this.errorOccurrences.size,
      rateLimited: this.isRateLimited(),
    };
  }

  /**
   * Clean up old error occurrences
   */
  cleanupOldOccurrences(): void {
    const maxAge = this.config.deduplicationWindowMs || 3600000;
    const now = Date.now();

    for (const [signature, occurrence] of this.errorOccurrences.entries()) {
      const age = now - occurrence.lastSeen.getTime();
      if (age > maxAge) {
        this.errorOccurrences.delete(signature);
      }
    }

    this.logger.debug(
      `Cleaned up old occurrences. Remaining: ${this.errorOccurrences.size}`
    );
  }
}
