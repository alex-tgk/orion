import * as winston from 'winston';
import { jsonFormatter } from '../formatters/json.formatter';
import { developmentFormatter } from '../formatters/development.formatter';

/**
 * Create console transport for Winston
 * @param pretty - Enable pretty printing for development
 * @param level - Minimum log level
 */
export function createConsoleTransport(pretty: boolean, level: string): winston.transport {
  return new winston.transports.Console({
    level,
    format: pretty ? developmentFormatter : jsonFormatter,
    handleExceptions: true,
    handleRejections: true,
  });
}
