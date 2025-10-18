import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

/**
 * Consumer for processing error queue jobs
 */
@Processor('error-processing')
export class ErrorProcessorConsumer {
  private readonly logger = new Logger(ErrorProcessorConsumer.name);

  @Process('process-error')
  async handleErrorProcessing(job: Job) {
    const { error } = job.data;

    this.logger.debug(
      `Processing error from queue: ${error.code} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
    );

    try {
      // Additional processing can be added here
      // For example: storing in database, sending to monitoring systems, etc.

      this.logger.debug(`Successfully processed error: ${error.code}`);
    } catch (err) {
      this.logger.error(`Failed to process error ${error.code}`, err);
      throw err; // Will trigger retry
    }
  }
}
