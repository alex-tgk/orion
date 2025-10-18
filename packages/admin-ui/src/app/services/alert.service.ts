import { Injectable, Logger } from '@nestjs/common';
import { Alert, AlertSeverity, AlertStatus, AlertsListResponse } from '../dto/health.dto';
import { CacheService } from './cache.service';

/**
 * Alert Management Service
 * Manages system alerts and notifications
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly alerts = new Map<string, Alert>();

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Create a new alert
   */
  async createAlert(
    serviceName: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      serviceName,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      status: AlertStatus.ACTIVE,
      metadata,
    };

    this.alerts.set(alert.id, alert);
    this.logger.log(`Created alert: ${alert.id} for service ${serviceName}`);

    return alert;
  }

  /**
   * Get alert by ID
   */
  async getAlert(alertId: string): Promise<Alert | null> {
    return this.alerts.get(alertId) || null;
  }

  /**
   * Get all alerts with optional filtering
   */
  async getAlerts(
    severity?: AlertSeverity,
    status?: AlertStatus,
    serviceName?: string
  ): Promise<AlertsListResponse> {
    let filteredAlerts = Array.from(this.alerts.values());

    if (severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
    }

    if (status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === status);
    }

    if (serviceName) {
      filteredAlerts = filteredAlerts.filter(a => a.serviceName === serviceName);
    }

    // Sort by timestamp descending
    filteredAlerts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const active = filteredAlerts.filter(a => a.status === AlertStatus.ACTIVE).length;
    const critical = filteredAlerts.filter(
      a => a.severity === AlertSeverity.CRITICAL && a.status === AlertStatus.ACTIVE
    ).length;

    return {
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      active,
      critical,
    };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Alert> {
    const alert = this.alerts.get(alertId);

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = acknowledgedBy;

    this.alerts.set(alertId, alert);
    this.logger.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<Alert> {
    const alert = this.alerts.get(alertId);

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date().toISOString();

    this.alerts.set(alertId, alert);
    this.logger.log(`Alert ${alertId} resolved`);

    return alert;
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    this.alerts.delete(alertId);
    this.logger.log(`Alert ${alertId} deleted`);
  }

  /**
   * Get active alert count by severity
   */
  async getAlertCounts() {
    const alerts = Array.from(this.alerts.values());
    const active = alerts.filter(a => a.status === AlertStatus.ACTIVE);

    return {
      total: alerts.length,
      active: active.length,
      info: active.filter(a => a.severity === AlertSeverity.INFO).length,
      warning: active.filter(a => a.severity === AlertSeverity.WARNING).length,
      error: active.filter(a => a.severity === AlertSeverity.ERROR).length,
      critical: active.filter(a => a.severity === AlertSeverity.CRITICAL).length,
    };
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Auto-cleanup resolved alerts older than 7 days
   */
  async cleanupOldAlerts(): Promise<number> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    this.alerts.forEach((alert, id) => {
      if (
        alert.status === AlertStatus.RESOLVED &&
        alert.resolvedAt &&
        new Date(alert.resolvedAt).getTime() < sevenDaysAgo
      ) {
        this.alerts.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old resolved alerts`);
    }

    return cleaned;
  }
}
