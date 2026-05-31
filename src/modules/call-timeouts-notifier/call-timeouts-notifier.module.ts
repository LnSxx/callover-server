import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { PresenceModule } from '../presence/presence.module';
import { CallTimeoutNotifierService } from './call-timeouts-notifier.service';

@Module({
  imports: [RealtimeModule, PresenceModule],
  providers: [CallTimeoutNotifierService],
  exports: [CallTimeoutNotifierService],
})
export class CallTimeoutsNotifierModule {}
