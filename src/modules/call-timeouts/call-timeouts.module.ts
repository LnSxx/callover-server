import { Module } from '@nestjs/common';
import { CallTimeoutsSchedulerService } from './call-timeouts-scheduler.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'call-timeouts',
    }),
  ],
  providers: [CallTimeoutsSchedulerService],
  exports: [CallTimeoutsSchedulerService],
})
export class CallTimeoutsModule {}
