import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CallAdministratorModule } from '../call-coordinator/call-coordinator.module';

@Module({
  imports: [RealtimeModule, SessionsModule, CallAdministratorModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
