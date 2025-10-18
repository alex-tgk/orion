import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '@orion/shared';
import { AdminEventsGateway } from './gateways/admin-events.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { SubscriptionManagerService } from './services/subscription-manager.service';
import { AdminEventEmitterService } from './services/event-emitter.service';
import { AdminEventListener } from './listeners/admin-event.listener';

/**
 * WebSocket Module for Admin UI
 * Provides real-time updates for the admin dashboard
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me-in-production',
      signOptions: {
        expiresIn: '1h',
      },
    }),
    EventEmitterModule.forRoot({
      // Use wildcards for event names
      wildcard: true,
      // Delimiter for namespaced events
      delimiter: '.',
      // Set this to `true` to use wildcards
      newListener: false,
      // Set this to `true` to emit the `removeListener` event
      removeListener: false,
      // Maximum number of listeners per event
      maxListeners: 10,
      // Show event name in memory leak message when more than max listeners
      verboseMemoryLeak: true,
      // Disable throwing uncaughtException if an error event is emitted and has no listeners
      ignoreErrors: false,
    }),
  ],
  providers: [
    AdminEventsGateway,
    WsJwtGuard,
    SubscriptionManagerService,
    AdminEventEmitterService,
    AdminEventListener,
  ],
  exports: [AdminEventEmitterService, AdminEventsGateway],
})
export class WebSocketModule {}
