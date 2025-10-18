import { bootstrapService } from '@orion/shared';
import { AppModule } from './app/app.module';

async function bootstrap() {
  await bootstrapService({
    serviceName: 'mcp-server',
    AppModule,
  });
}

bootstrap();
