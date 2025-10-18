import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { jsonFormatter } from '../formatters/json.formatter';
import type { LoggerConfig } from '../interfaces/logger-options.interface';

/**
 * Create file transports for Winston with rotation
 * @param config - Logger configuration
 */
export function createFileTransports(config: LoggerConfig): winston.transport[] {
  const transports: winston.transport[] = [];
  const fileOptions = config.fileOptions;

  if (!fileOptions) {
    return transports;
  }

  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: fileOptions.filename,
      datePattern: 'YYYY-MM-DD',
      maxSize: fileOptions.maxSize || '20m',
      maxFiles: fileOptions.maxFiles || '14d',
      format: jsonFormatter,
      level: config.level || 'info',
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // Separate error log file
  if (fileOptions.errorFilename) {
    transports.push(
      new DailyRotateFile({
        filename: fileOptions.errorFilename,
        datePattern: 'YYYY-MM-DD',
        maxSize: fileOptions.maxSize || '20m',
        maxFiles: fileOptions.maxFiles || '14d',
        format: jsonFormatter,
        level: 'error',
        handleExceptions: true,
        handleRejections: true,
      })
    );
  }

  return transports;
}
