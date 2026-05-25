import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { PresenceModule } from '../presence/presence.module';
import { CallsModule } from '../calls/calls.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RedisModule } from '../redis/redis.module';
import { CallPermissionsModule } from '../call-permissions/call-permissions.module';

@Module({
  imports: [
    RealtimeModule,
    CallPermissionsModule,
    SessionsModule,
    PresenceModule,
    CallsModule,
    RedisModule,
  ],
  providers: [SignalingGateway],
})
export class SignalingModule {}
