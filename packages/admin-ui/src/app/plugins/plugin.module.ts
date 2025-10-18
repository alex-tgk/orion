import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WidgetRegistry } from './registry/widget.registry';

/**
 * Global plugin module providing plugin infrastructure
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ':',
      maxListeners: 100,
    }),
  ],
  providers: [WidgetRegistry],
  exports: [WidgetRegistry],
})
export class PluginModule {}
