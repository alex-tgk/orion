import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Widget } from '../../../src/app/plugins/decorators/plugin.decorator';
import { SystemHealthController } from './system-health.controller';
import { SystemHealthService } from './system-health.service';
import { SystemHealthGateway } from './system-health.gateway';

/**
 * System Health Widget Module
 *
 * Provides real-time system health monitoring with:
 * - CPU and Memory usage
 * - Disk space monitoring
 * - Service status checks
 * - WebSocket updates every 5 seconds
 *
 * @example
 * // Add to app.module.ts imports:
 * import { SystemHealthWidgetModule } from './extensions/widgets/system-health/system-health.module';
 *
 * @Module({
 *   imports: [SystemHealthWidgetModule],
 * })
 * export class AppModule {}
 */
@Widget({
  id: 'system-health',
  name: 'System Health Monitor',
  version: '1.0.0',
  description: 'Real-time system resource monitoring with alerts',
  category: 'monitoring',
  icon: 'heartbeat',
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 3, height: 2 },
  maxSize: { width: 12, height: 6 },
  resizable: true,
  fullscreenCapable: true,
  exportable: true,
  exportFormats: ['json', 'csv'],
  configSchema: {
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
  },
  permissions: ['view:system-health'],
})
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SystemHealthController],
  providers: [SystemHealthService, SystemHealthGateway],
  exports: [SystemHealthService],
})
export class SystemHealthWidgetModule {}
