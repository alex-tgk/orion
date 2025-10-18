import { format } from 'winston';
import type { LogEntry } from '../interfaces/log-context.interface';

/**
 * JSON formatter for production logging
 * Outputs structured JSON logs for easy parsing by log aggregators
 */
export const jsonFormatter = format.combine(
  format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  format.errors({ stack: true }),
  format.json(),
  format.printf((info) => {
    const logEntry: LogEntry = {
      timestamp: info.timestamp,
      level: info.level,
      service: info.service,
      environment: info.environment,
      pid: process.pid,
      context: info.context,
      correlationId: info.correlationId,
      message: info.message,
      ...info.metadata,
    };

    // Include stack trace for errors
    if (info.stack) {
      logEntry.stack = info.stack;
    }

    return JSON.stringify(logEntry);
  })
);
