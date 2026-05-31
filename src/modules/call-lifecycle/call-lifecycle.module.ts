import { Module } from '@nestjs/common';
import { CallLifecycleService } from './call-lifecycle.service';
import { CallsModule } from '../calls/calls.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CallLogsModule } from '../call-logs/call-logs.module';
import { CallTimeoutsModule } from '../call-timeouts/call-timeouts.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [
    CallsModule,
    NotificationsModule,
    CallLogsModule,
    CallTimeoutsModule,
    RealtimeModule,
    PresenceModule,
  ],
  providers: [CallLifecycleService],
  exports: [CallLifecycleService],
})
export class CallLifecycleModule {}
