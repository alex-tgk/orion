import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AlertNotificationService {
  private readonly logger = new Logger(AlertNotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send alert notification via multiple channels
   */
  async sendAlert(alert: {
    title: string;
    description: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    budgetId?: string;
    serviceName?: string;
    currentValue: number;
    thresholdValue: number;
    variancePercent: number;
  }): Promise<void> {
    const emailEnabled = this.configService.get<boolean>('costTracking.alerts.emailEnabled');
    const slackEnabled = this.configService.get<boolean>('costTracking.alerts.slackEnabled');

    const promises: Promise<any>[] = [];

    if (emailEnabled) {
      promises.push(this.sendEmailAlert(alert));
    }

    if (slackEnabled) {
      promises.push(this.sendSlackAlert(alert));
    }

    try {
      await Promise.allSettled(promises);
      this.logger.log(`Alert notifications sent: ${alert.title}`);
    } catch (error) {
      this.logger.error('Failed to send alert notifications', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: any): Promise<void> {
    // In production, integrate with email service (SendGrid, SES, etc.)
    this.logger.log(`[EMAIL] ${alert.severity}: ${alert.title}`);
    this.logger.log(`[EMAIL] ${alert.description}`);

    // Example implementation:
    // const emailService = this.configService.get('email.service');
    // await emailService.send({
    //   to: alert.recipients,
    //   subject: `[${alert.severity}] ${alert.title}`,
    //   template: 'cost-alert',
    //   data: alert,
    // });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: any): Promise<void> {
    const webhookUrl = this.configService.get<string>('costTracking.alerts.slackWebhook');

    if (!webhookUrl) {
      this.logger.warn('Slack webhook URL not configured');
      return;
    }

    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);

    const message = {
      username: 'ORION Cost Tracker',
      icon_emoji: ':money_with_wings:',
      attachments: [
        {
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.description,
          fields: [
            {
              title: 'Severity',
              value: alert.severity,
              short: true,
            },
            {
              title: 'Current Value',
              value: `$${alert.currentValue.toFixed(2)}`,
              short: true,
            },
            {
              title: 'Threshold',
              value: `$${alert.thresholdValue.toFixed(2)}`,
              short: true,
            },
            {
              title: 'Over Budget',
              value: `${alert.variancePercent.toFixed(1)}%`,
              short: true,
            },
          ],
          footer: 'ORION Cost Tracking',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    if (alert.serviceName) {
      message.attachments[0].fields.push({
        title: 'Service',
        value: alert.serviceName,
        short: true,
      });
    }

    try {
      await axios.post(webhookUrl, message);
      this.logger.log(`Slack alert sent: ${alert.title}`);
    } catch (error) {
      this.logger.error('Failed to send Slack alert', error);
    }
  }

  /**
   * Send budget warning notification
   */
  async sendBudgetWarning(budget: {
    name: string;
    amount: number;
    currentSpend: number;
    spendPercent: number;
    threshold: number;
  }): Promise<void> {
    await this.sendAlert({
      title: `Budget Warning: ${budget.name}`,
      description: `Budget "${budget.name}" has reached ${budget.threshold}% of allocated amount. Current spend: $${budget.currentSpend.toFixed(2)} of $${budget.amount.toFixed(2)}`,
      severity: 'WARNING',
      currentValue: budget.currentSpend,
      thresholdValue: (budget.amount * budget.threshold) / 100,
      variancePercent: budget.spendPercent - budget.threshold,
    });
  }

  /**
   * Send budget critical notification
   */
  async sendBudgetCritical(budget: {
    name: string;
    amount: number;
    currentSpend: number;
    spendPercent: number;
    threshold: number;
  }): Promise<void> {
    await this.sendAlert({
      title: `Budget Critical: ${budget.name}`,
      description: `Budget "${budget.name}" has reached ${budget.threshold}% of allocated amount. Immediate action required! Current spend: $${budget.currentSpend.toFixed(2)} of $${budget.amount.toFixed(2)}`,
      severity: 'CRITICAL',
      currentValue: budget.currentSpend,
      thresholdValue: (budget.amount * budget.threshold) / 100,
      variancePercent: budget.spendPercent - budget.threshold,
    });
  }

  /**
   * Send budget exceeded notification
   */
  async sendBudgetExceeded(budget: {
    name: string;
    amount: number;
    currentSpend: number;
    spendPercent: number;
  }): Promise<void> {
    await this.sendAlert({
      title: `Budget Exceeded: ${budget.name}`,
      description: `Budget "${budget.name}" has been exceeded! Current spend: $${budget.currentSpend.toFixed(2)} of $${budget.amount.toFixed(2)} (${budget.spendPercent.toFixed(1)}%)`,
      severity: 'CRITICAL',
      currentValue: budget.currentSpend,
      thresholdValue: budget.amount,
      variancePercent: budget.spendPercent - 100,
    });
  }

  /**
   * Send cost anomaly alert
   */
  async sendCostAnomaly(anomaly: {
    serviceName: string;
    currentCost: number;
    expectedCost: number;
    variance: number;
    period: string;
  }): Promise<void> {
    await this.sendAlert({
      title: `Cost Anomaly Detected: ${anomaly.serviceName}`,
      description: `Unusual cost pattern detected for ${anomaly.serviceName}. Current cost ($${anomaly.currentCost.toFixed(2)}) is ${anomaly.variance.toFixed(1)}% higher than expected ($${anomaly.expectedCost.toFixed(2)}) for this ${anomaly.period}.`,
      severity: anomaly.variance > 50 ? 'CRITICAL' : 'WARNING',
      serviceName: anomaly.serviceName,
      currentValue: anomaly.currentCost,
      thresholdValue: anomaly.expectedCost,
      variancePercent: anomaly.variance,
    });
  }

  /**
   * Send daily cost summary
   */
  async sendDailySummary(summary: {
    totalCost: number;
    topServices: Array<{ name: string; cost: number }>;
    alerts: number;
    recommendations: number;
  }): Promise<void> {
    const webhookUrl = this.configService.get<string>('costTracking.alerts.slackWebhook');

    if (!webhookUrl) {
      return;
    }

    const topServicesText = summary.topServices
      .map((s, i) => `${i + 1}. ${s.name}: $${s.cost.toFixed(2)}`)
      .join('\n');

    const message = {
      username: 'ORION Cost Tracker',
      icon_emoji: ':bar_chart:',
      text: 'Daily Cost Summary',
      attachments: [
        {
          color: '#36a64f',
          title: 'Cost Summary',
          fields: [
            {
              title: "Today's Total Cost",
              value: `$${summary.totalCost.toFixed(2)}`,
              short: true,
            },
            {
              title: 'Active Alerts',
              value: summary.alerts.toString(),
              short: true,
            },
            {
              title: 'Top Services by Cost',
              value: topServicesText,
              short: false,
            },
            {
              title: 'Optimization Opportunities',
              value: `${summary.recommendations} recommendations available`,
              short: false,
            },
          ],
          footer: 'ORION Cost Tracking',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await axios.post(webhookUrl, message);
      this.logger.log('Daily cost summary sent');
    } catch (error) {
      this.logger.error('Failed to send daily summary', error);
    }
  }

  /**
   * Get color for severity
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#ff0000';
      case 'WARNING':
        return '#ffa500';
      case 'INFO':
        return '#0066cc';
      default:
        return '#808080';
    }
  }

  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'WARNING':
        return '⚠️';
      case 'INFO':
        return 'ℹ️';
      default:
        return '📢';
    }
  }
}
