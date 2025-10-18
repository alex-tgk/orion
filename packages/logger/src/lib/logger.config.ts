import * as winston from 'winston';
import type { LoggerConfig } from './interfaces/logger-options.interface';
import { createConsoleTransport } from './transports/console.transport';
import { createFileTransports } from './transports/file.transport';

/**
 * Sanitize sensitive data from log metadata
 * @param metadata - Log metadata
 * @param sensitiveFields - Fields to sanitize
 * @param replacement - Replacement value
 */
function sanitizeMetadata(
  metadata: Record<string, any>,
  sensitiveFields: string[],
  replacement: string
): Record<string, any> {
  const sanitized = { ...metadata };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = replacement;
    }
  }

  return sanitized;
}

/**
 * Create Winston logger configuration
 * @param config - Logger configuration options
 */
export function createLoggerConfig(config: LoggerConfig): winston.LoggerOptions {
  const transports: winston.transport[] = [];
  const transportTypes = config.transports || ['console'];

  // Default sensitive fields
  const sensitiveFields = config.sanitize?.fields || [
    'password',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'accessToken',
    'refreshToken',
  ];

  const replacement = config.sanitize?.replacement || '[REDACTED]';

  // Add console transport
  if (transportTypes.includes('console')) {
    transports.push(createConsoleTransport(config.pretty || false, config.level || 'info'));
  }

  // Add file transports
  if (transportTypes.includes('file') && config.fileOptions) {
    transports.push(...createFileTransports(config));
  }

  return {
    level: config.level || 'info',
    defaultMeta: {
      service: config.serviceName,
      environment: config.environment || process.env.NODE_ENV || 'development',
    },
    transports,
    exitOnError: false,
    // Sanitize metadata before logging
    format: winston.format((info) => {
      if (info.metadata && typeof info.metadata === 'object') {
        info.metadata = sanitizeMetadata(info.metadata, sensitiveFields, replacement);
      }
      return info;
    })(),
  };
}
