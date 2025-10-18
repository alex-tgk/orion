/**
 * Centralized Event Definitions
 *
 * All events used across the ORION platform microservices.
 */

export * from './user-events';
export * from './auth-events';
export * from './notification-events';

// Base event interface
export interface BaseEvent {
  eventId: string;
  timestamp: Date;
  version: string;
}

// Event metadata for tracing
export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  source: string; // Service that published the event
}
