import { Module } from '@nestjs/common';
import { CallCoordinatorService } from './call-coordinator.service';
import { PresenceModule } from '../presence/presence.module';
import { CallPermissionsModule } from '../call-permissions/call-permissions.module';
import { CallLifecycleModule } from '../call-lifecycle/call-lifecycle.module';

@Module({
  imports: [PresenceModule, CallPermissionsModule, CallLifecycleModule],
  providers: [CallCoordinatorService],
  exports: [CallCoordinatorService],
})
export class CallCoordinatorModule {}
