import { Injectable, Logger } from '@nestjs/common';
import { EventService } from '../services';
import { MetricService } from '../services';
import { UserAnalyticsService } from '../services';
import { EventType as AnalyticsEventType, MetricType } from '@prisma/analytics';

/**
 * Event Consumer
 * Consumes events from RabbitMQ and stores them in analytics database
 */
@Injectable()
export class EventConsumer {
  private readonly logger = new Logger(EventConsumer.name);

  constructor(
    private readonly eventService: EventService,
    private readonly metricService: MetricService,
    private readonly userAnalyticsService: UserAnalyticsService
  ) {}

  /**
   * Handle incoming events from RabbitMQ
   * This would be decorated with @RabbitSubscribe in a real implementation
   */
  async handleEvent(message: any) {
    try {
      const { eventName, data } = message;

      this.logger.debug(`Received event: ${eventName}`);

      // Track the event
      await this.eventService.trackEvent({
        eventName,
        eventType: this.mapEventType(eventName),
        category: this.extractCategory(eventName),
        userId: data.userId,
        sessionId: data.sessionId,
        serviceId: data.serviceId || this.extractServiceId(eventName),
        properties: data.properties || {},
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        location: data.location,
        duration: data.duration,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
        tags: data.tags || [],
      });

      // Update user analytics if userId is present
      if (data.userId) {
        await this.userAnalyticsService.updateUserAnalytics(data.userId);
      }

      // Record metrics based on event type
      await this.recordEventMetrics(eventName, data);

      this.logger.debug(`Successfully processed event: ${eventName}`);
    } catch (error) {
      this.logger.error('Failed to process event', error);
      throw error;
    }
  }

  /**
   * Handle user events
   */
  async handleUserEvent(message: any) {
    const { eventName, data } = message;

    try {
      this.logger.debug(`Received user event: ${eventName}`);

      await this.eventService.trackEvent({
        eventName,
        eventType: AnalyticsEventType.USER_ACTION,
        category: 'user',
        userId: data.userId,
        sessionId: data.sessionId,
        serviceId: 'user-service',
        properties: data,
        success: true,
      });

      // Update user analytics
      if (data.userId) {
        await this.userAnalyticsService.updateUserAnalytics(data.userId);
      }

      // Record user metrics
      await this.metricService.recordMetric({
        name: `user.${eventName}`,
        type: MetricType.COUNTER,
        value: 1,
        serviceId: 'user-service',
        userId: data.userId,
        tags: ['user', eventName],
      });
    } catch (error) {
      this.logger.error(`Failed to process user event: ${eventName}`, error);
      throw error;
    }
  }

  /**
   * Handle auth events
   */
  async handleAuthEvent(message: any) {
    const { eventName, data } = message;

    try {
      this.logger.debug(`Received auth event: ${eventName}`);

      await this.eventService.trackEvent({
        eventName,
        eventType: AnalyticsEventType.SYSTEM_EVENT,
        category: 'authentication',
        userId: data.userId,
        sessionId: data.sessionId,
        serviceId: 'auth-service',
        properties: data,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success ?? true,
        errorMessage: data.errorMessage,
      });

      // Record auth metrics
      await this.metricService.recordMetric({
        name: `auth.${eventName}`,
        type: MetricType.COUNTER,
        value: 1,
        serviceId: 'auth-service',
        userId: data.userId,
        labels: {
          success: String(data.success ?? true),
        },
        tags: ['authentication', eventName],
      });

      // Track login success/failure rates
      if (eventName === 'login') {
        await this.metricService.recordMetric({
          name: 'auth.login.rate',
          type: MetricType.GAUGE,
          value: data.success ? 1 : 0,
          serviceId: 'auth-service',
          labels: {
            status: data.success ? 'success' : 'failure',
          },
          tags: ['authentication', 'login'],
        });
      }
    } catch (error) {
      this.logger.error(`Failed to process auth event: ${eventName}`, error);
      throw error;
    }
  }

  /**
   * Handle performance events
   */
  async handlePerformanceEvent(message: any) {
    const { eventName, data } = message;

    try {
      this.logger.debug(`Received performance event: ${eventName}`);

      await this.eventService.trackEvent({
        eventName,
        eventType: AnalyticsEventType.PERFORMANCE,
        category: 'performance',
        serviceId: data.serviceId,
        properties: data,
        duration: data.duration,
        success: true,
      });

      // Record performance metrics
      if (data.latency !== undefined) {
        await this.metricService.recordMetric({
          name: 'performance.latency',
          type: MetricType.HISTOGRAM,
          value: data.latency,
          unit: 'milliseconds',
          serviceId: data.serviceId,
          labels: {
            endpoint: data.endpoint,
            method: data.method,
          },
          tags: ['performance', 'latency'],
        });
      }

      if (data.throughput !== undefined) {
        await this.metricService.recordMetric({
          name: 'performance.throughput',
          type: MetricType.GAUGE,
          value: data.throughput,
          unit: 'requests_per_second',
          serviceId: data.serviceId,
          tags: ['performance', 'throughput'],
        });
      }
    } catch (error) {
      this.logger.error(`Failed to process performance event: ${eventName}`, error);
      throw error;
    }
  }

  /**
   * Handle error events
   */
  async handleErrorEvent(message: any) {
    const { eventName, data } = message;

    try {
      this.logger.debug(`Received error event: ${eventName}`);

      await this.eventService.trackEvent({
        eventName,
        eventType: AnalyticsEventType.ERROR,
        category: 'error',
        userId: data.userId,
        sessionId: data.sessionId,
        serviceId: data.serviceId,
        properties: data,
        success: false,
        errorMessage: data.errorMessage,
        errorStack: data.errorStack,
      });

      // Record error metrics
      await this.metricService.recordMetric({
        name: 'error.count',
        type: MetricType.COUNTER,
        value: 1,
        serviceId: data.serviceId,
        labels: {
          errorType: data.errorType || 'unknown',
          severity: data.severity || 'error',
        },
        tags: ['error', data.errorType || 'unknown'],
      });
    } catch (error) {
      this.logger.error(`Failed to process error event: ${eventName}`, error);
      throw error;
    }
  }

  /**
   * Map event names to analytics event types
   */
  private mapEventType(eventName: string): AnalyticsEventType {
    if (eventName.startsWith('user.')) return AnalyticsEventType.USER_ACTION;
    if (eventName.startsWith('auth.')) return AnalyticsEventType.SYSTEM_EVENT;
    if (eventName.startsWith('performance.')) return AnalyticsEventType.PERFORMANCE;
    if (eventName.startsWith('error.')) return AnalyticsEventType.ERROR;
    if (eventName.startsWith('business.')) return AnalyticsEventType.BUSINESS_METRIC;
    return AnalyticsEventType.CUSTOM;
  }

  /**
   * Extract category from event name
   */
  private extractCategory(eventName: string): string | undefined {
    const parts = eventName.split('.');
    return parts.length > 1 ? parts[0] : undefined;
  }

  /**
   * Extract service ID from event name
   */
  private extractServiceId(eventName: string): string | undefined {
    if (eventName.startsWith('user.')) return 'user-service';
    if (eventName.startsWith('auth.')) return 'auth-service';
    if (eventName.startsWith('notification.')) return 'notification-service';
    return undefined;
  }

  /**
   * Record metrics based on event type
   */
  private async recordEventMetrics(eventName: string, data: any) {
    try {
      // Record event counter
      await this.metricService.recordMetric({
        name: `event.${eventName}.count`,
        type: MetricType.COUNTER,
        value: 1,
        serviceId: data.serviceId,
        userId: data.userId,
        tags: [eventName, 'event'],
      });

      // Record event duration if present
      if (data.duration !== undefined) {
        await this.metricService.recordMetric({
          name: `event.${eventName}.duration`,
          type: MetricType.HISTOGRAM,
          value: data.duration,
          unit: 'milliseconds',
          serviceId: data.serviceId,
          userId: data.userId,
          tags: [eventName, 'duration'],
        });
      }
    } catch (error) {
      this.logger.error('Failed to record event metrics', error);
      // Don't throw - metrics are supplementary
    }
  }
}
