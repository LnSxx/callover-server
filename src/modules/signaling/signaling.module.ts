import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { PresenceModule } from '../presence/presence.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [PresenceModule, CallsModule],
  providers: [SignalingGateway],
})
export class SignalingModule {}
