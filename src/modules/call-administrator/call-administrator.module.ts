import { Module } from '@nestjs/common';
import { CallAdministratorService } from './call-administrator.service';
import { PresenceModule } from '../presence/presence.module';
import { CallPermissionsModule } from '../call-permissions/call-permissions.module';
import { CallLifecycleModule } from '../call-lifecycle/call-lifecycle.module';

@Module({
  imports: [PresenceModule, CallPermissionsModule, CallLifecycleModule],
  providers: [CallAdministratorService],
  exports: [CallAdministratorService],
})
export class CallAdministratorModule {}
