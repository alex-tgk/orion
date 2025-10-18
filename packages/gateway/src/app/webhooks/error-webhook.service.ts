import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ErrorWebhookDto } from './dto/error-webhook.dto';
import {
  ErrorToIssueService,
  ErrorToIssueConfig,
} from '@orion/shared/automation';
import { AppError, ErrorClassifier } from '@orion/shared/errors';
import { ConfigService } from '@nestjs/config';

/**
 * Service for processing error webhooks
 */
@Injectable()
export class ErrorWebhookService {
  private readonly logger = new Logger(ErrorWebhookService.name);
  private readonly errorToIssueService: ErrorToIssueService;
  private processedCount = 0;
  private failedCount = 0;

  constructor(
    @InjectQueue('error-processing') private readonly errorQueue: Queue,
    private readonly configService: ConfigService
  ) {
    // Initialize Error-to-Issue service
    const config: ErrorToIssueConfig = {
      githubToken: this.configService.get<string>('GITHUB_TOKEN', ''),
      githubRepo: this.configService.get<string>('GITHUB_REPO', ''),
      enabled: this.configService.get<boolean>('ERROR_TO_ISSUE_ENABLED', true),
      maxIssuesPerHour: this.configService.get<number>('ERROR_TO_ISSUE_MAX_PER_HOUR', 50),
      deduplicationWindowMs: this.configService.get<number>('ERROR_TO_ISSUE_DEDUP_WINDOW_MS', 3600000),
      defaultAssignees: this.configService.get<string>('ERROR_TO_ISSUE_ASSIGNEES', '')
        .split(',')
        .filter(Boolean),
    };

    this.errorToIssueService = new ErrorToIssueService(config);

    // Clean up old occurrences every hour
    setInterval(() => {
      this.errorToIssueService.cleanupOldOccurrences();
    }, 3600000);
  }

  /**
   * Process error webhook
   */
  async processErrorWebhook(errorDto: ErrorWebhookDto): Promise<void> {
    try {
      // Convert DTO to AppError
      const appError = this.convertToAppError(errorDto);

      // Add to processing queue for async handling
      await this.errorQueue.add(
        'process-error',
        { error: appError.toJSON() },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      this.logger.debug(
        `Error queued for processing: ${appError.code} (${appError.signature})`
      );

      // Process immediately in background (don't await)
      this.processErrorAsync(appError);
    } catch (error) {
      this.failedCount++;
      this.logger.error('Failed to process error webhook', error);
      throw error;
    }
  }

  /**
   * Process error asynchronously
   */
  private async processErrorAsync(error: AppError): Promise<void> {
    try {
      // Attempt to create GitHub issue
      const issue = await this.errorToIssueService.processError(error);

      if (issue) {
        this.logger.log(
          `GitHub issue created for error ${error.code}: ${issue.html_url}`
        );
      }

      this.processedCount++;
    } catch (err) {
      this.failedCount++;
      this.logger.error('Failed to process error asynchronously', err);
    }
  }

  /**
   * Convert webhook DTO to AppError
   */
  private convertToAppError(dto: ErrorWebhookDto): AppError {
    // If error is already classified, use that information
    if (dto.severity && dto.category) {
      return new AppError(
        dto.message,
        dto.statusCode,
        dto.severity,
        dto.category,
        {
          service: dto.service,
          correlationId: dto.correlationId,
          userId: dto.userId,
          path: dto.path,
          method: dto.method,
          metadata: dto.metadata,
          timestamp: new Date(dto.timestamp),
        },
        dto.isOperational,
        dto.code
      );
    }

    // Otherwise, classify the error
    const genericError = new Error(dto.message);
    genericError.name = dto.name || 'Error';
    genericError.stack = dto.stack;

    return ErrorClassifier.classify(genericError, {
      service: dto.service,
      correlationId: dto.correlationId,
      userId: dto.userId,
      path: dto.path,
      method: dto.method,
      metadata: dto.metadata,
    });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      webhook: {
        processedCount: this.processedCount,
        failedCount: this.failedCount,
      },
      issueService: this.errorToIssueService.getStatistics(),
    };
  }
}
