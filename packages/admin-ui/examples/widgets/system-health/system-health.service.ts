import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import * as os from 'os';
import { SystemHealthGateway } from './system-health.gateway';

interface HealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  timestamp: Date;
}

interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'disk';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);
  private readonly history: HealthMetrics[] = [];
  private readonly maxHistorySize = 1000; // Keep last 1000 data points
  private readonly alerts: Alert[] = [];

  // Default thresholds
  private thresholds = {
    cpu: 80,
    memory: 85,
    disk: 90,
  };

  constructor(private readonly gateway: SystemHealthGateway) {}

  /**
   * Collect system health metrics every 5 seconds
   */
  @Interval(5000)
  async collectMetrics() {
    const metrics = await this.getSystemMetrics();

    // Add to history
    this.history.push(metrics);

    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Check for alerts
    this.checkThresholds(metrics);

    // Broadcast to connected clients
    this.gateway.broadcastHealthUpdate(metrics);
  }

  /**
   * Get current system health
   */
  async getCurrentHealth(includeHistory = false) {
    const current = await this.getSystemMetrics();

    return {
      current,
      history: includeHistory ? this.getRecentHistory(60) : undefined,
      alerts: this.getActiveAlerts(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<HealthMetrics> {
    const cpuUsage = await this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const diskUsage = await this.getDiskUsage();

    return {
      cpu: Math.round(cpuUsage * 100) / 100,
      memory: Math.round(memoryUsage * 100) / 100,
      disk: Math.round(diskUsage * 100) / 100,
      uptime: Math.floor(os.uptime()),
      timestamp: new Date(),
    };
  }

  /**
   * Calculate CPU usage
   */
  private async getCpuUsage(): Promise<number> {
    const cpus = os.cpus();

    // Calculate average CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle) / total;

    return Math.max(0, Math.min(100, usage));
  }

  /**
   * Calculate memory usage
   */
  private getMemoryUsage(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return (usedMem / totalMem) * 100;
  }

  /**
   * Calculate disk usage (simplified)
   */
  private async getDiskUsage(): Promise<number> {
    // This is a simplified version
    // In production, use a library like 'diskusage' or 'node-df'
    // For demo purposes, return a random value
    return Math.random() * 30 + 50; // 50-80%
  }

  /**
   * Check metrics against thresholds
   */
  private checkThresholds(metrics: HealthMetrics) {
    // Clear old alerts
    this.clearExpiredAlerts();

    // Check CPU
    if (metrics.cpu > this.thresholds.cpu) {
      this.addAlert('cpu', metrics.cpu, this.thresholds.cpu);
    }

    // Check Memory
    if (metrics.memory > this.thresholds.memory) {
      this.addAlert('memory', metrics.memory, this.thresholds.memory);
    }

    // Check Disk
    if (metrics.disk > this.thresholds.disk) {
      this.addAlert('disk', metrics.disk, this.thresholds.disk);
    }
  }

  /**
   * Add new alert
   */
  private addAlert(
    type: 'cpu' | 'memory' | 'disk',
    value: number,
    threshold: number,
  ) {
    // Check if alert already exists for this type
    const existingAlert = this.alerts.find((a) => a.type === type);
    if (existingAlert) {
      existingAlert.value = value;
      existingAlert.timestamp = new Date();
      return;
    }

    const severity: 'warning' | 'critical' =
      value > threshold + 10 ? 'critical' : 'warning';

    const alert: Alert = {
      id: `${type}-${Date.now()}`,
      type,
      severity,
      message: `${type.toUpperCase()} usage is ${severity}: ${value.toFixed(1)}% (threshold: ${threshold}%)`,
      value,
      threshold,
      timestamp: new Date(),
    };

    this.alerts.push(alert);
    this.logger.warn(alert.message);

    // Broadcast alert
    this.gateway.broadcastAlert(alert);
  }

  /**
   * Clear expired alerts (older than 5 minutes)
   */
  private clearExpiredAlerts() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeAlerts = this.alerts.filter(
      (alert) => alert.timestamp > fiveMinutesAgo,
    );

    if (activeAlerts.length !== this.alerts.length) {
      this.alerts.length = 0;
      this.alerts.push(...activeAlerts);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    this.clearExpiredAlerts();
    return [...this.alerts];
  }

  /**
   * Get historical data
   */
  getHistory(durationMinutes: number) {
    const cutoff = new Date(Date.now() - durationMinutes * 60 * 1000);
    return this.history.filter((m) => m.timestamp > cutoff);
  }

  /**
   * Get recent history
   */
  private getRecentHistory(minutes: number) {
    return this.getHistory(minutes);
  }

  /**
   * Get configuration schema
   */
  getConfigSchema() {
    return {
      type: 'object',
      properties: {
        refreshInterval: {
          type: 'number',
          default: 5000,
          minimum: 1000,
          maximum: 60000,
          description: 'Update interval in milliseconds',
        },
        cpuThreshold: {
          type: 'number',
          default: 80,
          minimum: 0,
          maximum: 100,
          description: 'CPU usage alert threshold (%)',
        },
        memoryThreshold: {
          type: 'number',
          default: 85,
          minimum: 0,
          maximum: 100,
          description: 'Memory usage alert threshold (%)',
        },
        diskThreshold: {
          type: 'number',
          default: 90,
          minimum: 0,
          maximum: 100,
          description: 'Disk usage alert threshold (%)',
        },
        showAlerts: {
          type: 'boolean',
          default: true,
          description: 'Show alert notifications',
        },
      },
      required: ['refreshInterval'],
    };
  }

  /**
   * Update thresholds
   */
  updateThresholds(config: {
    cpuThreshold?: number;
    memoryThreshold?: number;
    diskThreshold?: number;
  }) {
    if (config.cpuThreshold !== undefined) {
      this.thresholds.cpu = config.cpuThreshold;
    }
    if (config.memoryThreshold !== undefined) {
      this.thresholds.memory = config.memoryThreshold;
    }
    if (config.diskThreshold !== undefined) {
      this.thresholds.disk = config.diskThreshold;
    }

    this.logger.log(`Thresholds updated: ${JSON.stringify(this.thresholds)}`);
  }
}
