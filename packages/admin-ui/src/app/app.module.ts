import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PortRegistryModule } from '@orion/shared';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ObservabilityModule } from './observability.module';
import { WebSocketModule } from './websocket.module';

@Module({
  imports: [
    PortRegistryModule,
    ObservabilityModule,
    WebSocketModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*', '/health*'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
