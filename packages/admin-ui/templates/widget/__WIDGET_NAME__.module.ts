import { Module } from '@nestjs/common';
import { Widget } from '../../src/app/plugins/decorators/plugin.decorator';
import { WidgetNameController } from './__WIDGET_NAME__.controller';
import { WidgetNameService } from './__WIDGET_NAME__.service';
// Uncomment if using WebSocket
// import { WidgetNameGateway } from './__WIDGET_NAME__.gateway';

/**
 * WIDGET_DESCRIPTION
 *
 * @example
 * // Add to app.module.ts imports:
 * import { WidgetNameModule } from './extensions/widgets/__WIDGET_NAME__/__WIDGET_NAME__.module';
 *
 * @Module({
 *   imports: [WidgetNameModule],
 * })
 * export class AppModule {}
 */
@Widget({
  id: '__WIDGET_NAME__',
  name: 'WidgetName',
  version: 'WIDGET_VERSION',
  description: 'WIDGET_DESCRIPTION',
  category: 'WIDGET_CATEGORY', // dashboard | analytics | monitoring | system | custom
  icon: 'WIDGET_ICON',
  defaultSize: { width: 4, height: 3 },
  minSize: { width: 2, height: 2 },
  maxSize: { width: 12, height: 6 },
  resizable: true,
  fullscreenCapable: false,
  exportable: false,
  exportFormats: [], // ['csv', 'json', 'pdf', 'png']
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
      // Add your configuration properties here
    },
    required: ['refreshInterval'],
  },
  permissions: [], // ['view:__WIDGET_NAME__']
})
@Module({
  imports: [],
  controllers: [WidgetNameController],
  providers: [
    WidgetNameService,
    // WidgetNameGateway, // Uncomment if using WebSocket
  ],
  exports: [WidgetNameService],
})
export class WidgetNameModule {}
