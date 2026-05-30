import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { SessionsModule } from '../sessions/sessions.module';
import { CallCoordinatorModule } from '../call-coordinator/call-coordinator.module';

@Module({
  imports: [RealtimeModule, SessionsModule, CallCoordinatorModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
