import { format } from 'winston';
import * as colors from 'colors/safe';

/**
 * Development formatter with pretty printing and colors
 * Makes logs human-readable during development
 */
export const developmentFormatter = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.printf((info) => {
    const { timestamp, level, context, correlationId, message, stack, ...metadata } = info;

    // Colorize log levels
    let colorizedLevel = level.toUpperCase();
    switch (level) {
      case 'error':
        colorizedLevel = colors.red(colorizedLevel);
        break;
      case 'warn':
        colorizedLevel = colors.yellow(colorizedLevel);
        break;
      case 'info':
        colorizedLevel = colors.green(colorizedLevel);
        break;
      case 'http':
        colorizedLevel = colors.cyan(colorizedLevel);
        break;
      case 'debug':
        colorizedLevel = colors.blue(colorizedLevel);
        break;
      case 'verbose':
        colorizedLevel = colors.magenta(colorizedLevel);
        break;
    }

    // Build log message
    let logMessage = `${colors.gray(timestamp)} ${colorizedLevel}`;

    if (context) {
      logMessage += ` ${colors.yellow(`[${context}]`)}`;
    }

    if (correlationId) {
      logMessage += ` ${colors.cyan(`{${correlationId.substring(0, 8)}}`)}`;
    }

    logMessage += ` ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      logMessage += `\n${colors.gray(JSON.stringify(metadata, null, 2))}`;
    }

    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${colors.red(stack)}`;
    }

    return logMessage;
  })
);
