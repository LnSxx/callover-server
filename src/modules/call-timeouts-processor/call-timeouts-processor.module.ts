import { Module } from '@nestjs/common';
import { CallLifecycleModule } from '../call-lifecycle/call-lifecycle.module';
import { CallTimeoutsProcessor } from './call-timeouts-processor';

@Module({
  imports: [CallLifecycleModule],
  providers: [CallTimeoutsProcessor],
  exports: [CallTimeoutsProcessor],
})
export class CallTimeoutsProcessorModule {}
