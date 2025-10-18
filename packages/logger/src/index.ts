/**
 * @orion/logger - Centralized logging service for ORION microservices
 *
 * Features:
 * - Winston-based structured logging
 * - Correlation ID support via AsyncLocalStorage
 * - JSON formatting for production
 * - Pretty printing for development
 * - Log rotation and archiving
 * - Sensitive data sanitization
 * - NestJS integration
 */

// Core service and module
export { LoggerService } from './lib/logger.service';
export { LoggerModule } from './lib/logger.module';

// Interfaces
export type { LoggerConfig, LoggerModuleOptions } from './lib/interfaces/logger-options.interface';
export type { LogContext, LogEntry } from './lib/interfaces/log-context.interface';

// Configuration
export { createLoggerConfig } from './lib/logger.config';

// Transports
export { createConsoleTransport } from './lib/transports/console.transport';
export { createFileTransports } from './lib/transports/file.transport';

// Formatters
export { jsonFormatter } from './lib/formatters/json.formatter';
export { developmentFormatter } from './lib/formatters/development.formatter';
