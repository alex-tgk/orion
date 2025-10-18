import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SystemEvent,
  SystemEventType,
  ServiceHealth,
  Alert,
  ServiceMetrics,
} from '../types/websocket-events.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for emitting events that will be broadcast via WebSocket
 * Other services can inject this to emit events to the admin dashboard
 */
@Injectable()
export class AdminEventEmitterService {
  private readonly logger = new Logger(AdminEventEmitterService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a service health update event
   */
  emitServiceHealthUpdate(health: ServiceHealth): void {
    this.logger.debug(`Emitting service health update for ${health.serviceName}`);
    this.eventEmitter.emit('admin.service-health.update', health);
  }

  /**
   * Emit a system event
   */
  emitSystemEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SystemEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    };

    this.logger.debug(
      `Emitting system event: ${fullEvent.type} from ${fullEvent.serviceName}`,
    );
    this.eventEmitter.emit('admin.system-event', fullEvent);
  }

  /**
   * Emit a metrics update
   */
  emitMetricsUpdate(metrics: ServiceMetrics): void {
    this.logger.debug(`Emitting metrics update for ${metrics.serviceName}`);
    this.eventEmitter.emit('admin.metrics.update', metrics);
  }

  /**
   * Emit a new alert
   */
  emitAlert(alert: Omit<Alert, 'id' | 'timestamp'>): void {
    const fullAlert: Alert = {
      ...alert,
      id: uuidv4(),
      timestamp: new Date(),
    };

    this.logger.log(
      `Emitting alert: ${fullAlert.type} (${fullAlert.severity}) for ${fullAlert.serviceName}`,
    );
    this.eventEmitter.emit('admin.alert.new', fullAlert);
  }

  /**
   * Emit alert resolution
   */
  emitAlertResolved(alertId: string, resolvedAt: Date = new Date()): void {
    this.logger.log(`Emitting alert resolution: ${alertId}`);
    this.eventEmitter.emit('admin.alert.resolved', { alertId, resolvedAt });
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR COMMON EVENTS
  // ============================================================================

  /**
   * Emit service started event
   */
  serviceStarted(serviceName: string, port: number, metadata?: Record<string, unknown>): void {
    this.emitSystemEvent({
      type: SystemEventType.SERVICE_STARTED,
      serviceName,
      severity: 'info',
      message: `Service started on port ${port}`,
      metadata: { port, ...metadata },
    });
  }

  /**
   * Emit service stopped event
   */
  serviceStopped(serviceName: string, reason?: string): void {
    this.emitSystemEvent({
      type: SystemEventType.SERVICE_STOPPED,
      serviceName,
      severity: 'warning',
      message: reason || 'Service stopped',
      metadata: { reason },
    });
  }

  /**
   * Emit service error event
   */
  serviceError(serviceName: string, error: Error, metadata?: Record<string, unknown>): void {
    this.emitSystemEvent({
      type: SystemEventType.SERVICE_ERROR,
      serviceName,
      severity: 'error',
      message: error.message,
      metadata: {
        error: error.name,
        stack: error.stack,
        ...metadata,
      },
    });
  }

  /**
   * Emit request received event
   */
  requestReceived(
    serviceName: string,
    requestId: string,
    method: string,
    path: string,
    userId?: string,
  ): void {
    this.emitSystemEvent({
      type: SystemEventType.REQUEST_RECEIVED,
      serviceName,
      severity: 'info',
      message: `${method} ${path}`,
      requestId,
      userId,
      metadata: { method, path },
    });
  }

  /**
   * Emit request completed event
   */
  requestCompleted(
    serviceName: string,
    requestId: string,
    statusCode: number,
    responseTime: number,
  ): void {
    this.emitSystemEvent({
      type: SystemEventType.REQUEST_COMPLETED,
      serviceName,
      severity: 'info',
      message: `Request completed with status ${statusCode}`,
      requestId,
      metadata: { statusCode, responseTime },
    });
  }

  /**
   * Emit request failed event
   */
  requestFailed(
    serviceName: string,
    requestId: string,
    statusCode: number,
    error: string,
  ): void {
    this.emitSystemEvent({
      type: SystemEventType.REQUEST_FAILED,
      serviceName,
      severity: statusCode >= 500 ? 'error' : 'warning',
      message: `Request failed with status ${statusCode}: ${error}`,
      requestId,
      metadata: { statusCode, error },
    });
  }

  /**
   * Emit authentication success event
   */
  authenticationSuccess(serviceName: string, userId: string, email: string): void {
    this.emitSystemEvent({
      type: SystemEventType.AUTHENTICATION_SUCCESS,
      serviceName,
      severity: 'info',
      message: `User authenticated: ${email}`,
      userId,
      metadata: { email },
    });
  }

  /**
   * Emit authentication failure event
   */
  authenticationFailure(serviceName: string, email: string, reason: string): void {
    this.emitSystemEvent({
      type: SystemEventType.AUTHENTICATION_FAILURE,
      serviceName,
      severity: 'warning',
      message: `Authentication failed for ${email}: ${reason}`,
      metadata: { email, reason },
    });
  }

  /**
   * Emit database query event
   */
  databaseQuery(
    serviceName: string,
    query: string,
    duration: number,
    requestId?: string,
  ): void {
    this.emitSystemEvent({
      type: SystemEventType.DATABASE_QUERY,
      serviceName,
      severity: duration > 1000 ? 'warning' : 'info',
      message: `Database query executed in ${duration}ms`,
      requestId,
      metadata: { query, duration },
    });
  }

  /**
   * Emit cache hit event
   */
  cacheHit(serviceName: string, key: string, requestId?: string): void {
    this.emitSystemEvent({
      type: SystemEventType.CACHE_HIT,
      serviceName,
      severity: 'info',
      message: `Cache hit for key: ${key}`,
      requestId,
      metadata: { key },
    });
  }

  /**
   * Emit cache miss event
   */
  cacheMiss(serviceName: string, key: string, requestId?: string): void {
    this.emitSystemEvent({
      type: SystemEventType.CACHE_MISS,
      serviceName,
      severity: 'info',
      message: `Cache miss for key: ${key}`,
      requestId,
      metadata: { key },
    });
  }
}
