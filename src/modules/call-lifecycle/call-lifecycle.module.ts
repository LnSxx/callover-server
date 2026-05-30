import { Module } from '@nestjs/common';
import { CallLifecycleService } from './call-lifecycle.service';
import { CallsModule } from '../calls/calls.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CallLogsModule } from '../call-logs/call-logs.module';
import { CallTimeoutsModule } from '../call-timeouts/call-timeouts.module';

@Module({
  imports: [
    CallsModule,
    NotificationsModule,
    CallLogsModule,
    CallTimeoutsModule,
  ],
  providers: [CallLifecycleService],
  exports: [CallLifecycleService],
})
export class CallLifecycleModule {}
