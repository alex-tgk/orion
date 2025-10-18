import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ObservabilityService } from './observability.service';
import { EventsService } from './events.service';
import { EventLevel, EventCategory } from '../dto/system-events.dto';
import { ServiceStatus } from '../dto/service-health.dto';

/**
 * Health Monitoring Service
 *
 * Provides background monitoring of service health across the ORION platform.
 * This service runs periodic health checks, detects status changes, generates
 * alerts for unhealthy services, and logs significant health events.
 *
 * Features:
 * - Periodic health checks (configurable interval)
 * - Service status change detection
 * - Automatic event logging for health changes
 * - Alert generation for degraded/unhealthy services
 * - Graceful startup and shutdown
 *
 * The service maintains an internal state of previous health statuses to detect
 * changes and avoid duplicate alerts.
 */
@Injectable()
export class HealthMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthMonitorService.name);
  private monitoringInterval: NodeJS.Timeout | null = null;
  private previousHealthStates = new Map<string, ServiceStatus>();
  private isRunning = false;

  // Configuration
  private readonly MONITORING_INTERVAL_MS = parseInt(
    process.env['HEALTH_MONITOR_INTERVAL_MS'] || '30000',
    10,
  ); // Default: 30 seconds
  private readonly STARTUP_DELAY_MS = parseInt(
    process.env['HEALTH_MONITOR_STARTUP_DELAY_MS'] || '10000',
    10,
  ); // Default: 10 seconds

  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly eventsService: EventsService,
  ) {}

  async onModuleInit() {
    // Delay startup to allow services to initialize
    setTimeout(() => {
      this.startMonitoring();
    }, this.STARTUP_DELAY_MS);
  }

  async onModuleDestroy() {
    this.stopMonitoring();
  }

  /**
   * Start background health monitoring
   */
  startMonitoring(): void {
    if (this.isRunning) {
      this.logger.warn('Health monitoring is already running');
      return;
    }

    this.logger.log(
      `Starting health monitoring (interval: ${this.MONITORING_INTERVAL_MS}ms)`,
    );
    this.isRunning = true;

    // Run first check immediately
    this.performHealthCheck();

    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.MONITORING_INTERVAL_MS);
  }

  /**
   * Stop background health monitoring
   */
  stopMonitoring(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.log('Stopping health monitoring');
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Perform a complete health check across all services
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const servicesList = await this.observabilityService.getServicesList();

      for (const service of servicesList.services) {
        const previousStatus = this.previousHealthStates.get(service.serviceName);

        // Detect status changes
        if (previousStatus && previousStatus !== service.status) {
          this.handleStatusChange(
            service.serviceName,
            previousStatus,
            service.status,
          );
        }

        // Generate alerts for unhealthy services
        if (
          service.status === ServiceStatus.UNHEALTHY ||
          service.status === ServiceStatus.DEGRADED
        ) {
          this.generateHealthAlert(service.serviceName, service.status);
        }

        // Update state
        this.previousHealthStates.set(service.serviceName, service.status);
      }

      this.logger.debug(
        `Health check completed: ${servicesList.healthy}/${servicesList.total} healthy`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Health check failed: ${message}`);

      // Log the error as a system event
      this.eventsService.logEvent(
        EventLevel.ERROR,
        EventCategory.SYSTEM,
        'admin-ui',
        'Health monitoring check failed',
        { error: message },
      );
    }
  }

  /**
   * Handle service status changes
   */
  private handleStatusChange(
    serviceName: string,
    previousStatus: ServiceStatus,
    currentStatus: ServiceStatus,
  ): void {
    const level = this.determineEventLevel(currentStatus);
    const message = `Service status changed from ${previousStatus} to ${currentStatus}`;

    this.logger.log(`${serviceName}: ${message}`);

    this.eventsService.logEvent(
      level,
      EventCategory.SERVICE,
      serviceName,
      message,
      {
        previousStatus,
        currentStatus,
        changedAt: new Date().toISOString(),
      },
    );
  }

  /**
   * Generate health alerts for problematic services
   */
  private generateHealthAlert(
    serviceName: string,
    status: ServiceStatus,
  ): void {
    const level =
      status === ServiceStatus.UNHEALTHY ? EventLevel.CRITICAL : EventLevel.WARN;
    const message =
      status === ServiceStatus.UNHEALTHY
        ? 'Service is unhealthy and requires immediate attention'
        : 'Service is degraded and may have reduced functionality';

    // Only log if status persists (check previous state)
    const previousStatus = this.previousHealthStates.get(serviceName);
    if (previousStatus === status) {
      // Status hasn't changed, avoid spamming alerts
      return;
    }

    this.logger.warn(`${serviceName}: ${message}`);

    this.eventsService.logEvent(level, EventCategory.PERFORMANCE, serviceName, message, {
      status,
      alertedAt: new Date().toISOString(),
    });
  }

  /**
   * Determine appropriate event level based on service status
   */
  private determineEventLevel(status: ServiceStatus): EventLevel {
    switch (status) {
      case ServiceStatus.UNHEALTHY:
        return EventLevel.CRITICAL;
      case ServiceStatus.DEGRADED:
        return EventLevel.WARN;
      case ServiceStatus.HEALTHY:
        return EventLevel.INFO;
      default:
        return EventLevel.INFO;
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isRunning: boolean;
    intervalMs: number;
    servicesMonitored: number;
  } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.MONITORING_INTERVAL_MS,
      servicesMonitored: this.previousHealthStates.size,
    };
  }

  /**
   * Manually trigger a health check
   */
  async triggerHealthCheck(): Promise<void> {
    this.logger.log('Manually triggered health check');
    await this.performHealthCheck();
  }

  /**
   * Clear previous health states (useful for testing or reset)
   */
  clearHealthStates(): void {
    this.previousHealthStates.clear();
    this.logger.log('Health states cleared');
  }
}
