import { Global, Module } from '@nestjs/common';
import { PortRegistryService } from './port-registry.service';

@Global()
@Module({
  providers: [PortRegistryService],
  exports: [PortRegistryService],
})
export class PortRegistryModule {}
