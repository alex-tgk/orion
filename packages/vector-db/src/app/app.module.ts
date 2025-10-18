import { Module } from '@nestjs/common';
import { PortRegistryModule } from '@orion/shared';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PortRegistryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
