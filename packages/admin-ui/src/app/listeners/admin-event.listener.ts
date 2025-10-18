import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AdminEventsGateway } from '../gateways/admin-events.gateway';
import {
  ServiceHealth,
  SystemEvent,
  Alert,
  ServiceMetrics,
} from '../types/websocket-events.types';

/**
 * Listener for admin events
 * Bridges between EventEmitter2 and WebSocket gateway
 */
@Injectable()
export class AdminEventListener {
  private readonly logger = new Logger(AdminEventListener.name);

  constructor(private readonly gateway: AdminEventsGateway) {}

  @OnEvent('admin.service-health.update')
  handleServiceHealthUpdate(health: ServiceHealth) {
    this.logger.debug(`Broadcasting service health update for ${health.serviceName}`);
    this.gateway.broadcastServiceHealth(health.serviceName, health);
  }

  @OnEvent('admin.system-event')
  handleSystemEvent(event: SystemEvent) {
    this.logger.debug(`Broadcasting system event: ${event.type} from ${event.serviceName}`);
    this.gateway.broadcastSystemEvent(event);
  }

  @OnEvent('admin.metrics.update')
  handleMetricsUpdate(metrics: ServiceMetrics) {
    this.logger.debug(`Broadcasting metrics update for ${metrics.serviceName}`);
    this.gateway.broadcastMetrics(metrics.serviceName, metrics);
  }

  @OnEvent('admin.alert.new')
  handleNewAlert(alert: Alert) {
    this.logger.log(`Broadcasting new alert: ${alert.type} (${alert.severity}) for ${alert.serviceName}`);
    this.gateway.broadcastAlert(alert);
  }

  @OnEvent('admin.alert.resolved')
  handleAlertResolved(data: { alertId: string; resolvedAt: Date }) {
    this.logger.log(`Broadcasting alert resolution: ${data.alertId}`);
    this.gateway.broadcastAlertResolved(data.alertId);
  }
}
