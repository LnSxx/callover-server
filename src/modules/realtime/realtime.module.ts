import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { SessionsModule } from '../sessions/sessions.module';
import { PresenceModule } from '../presence/presence.module';
import { PresenceSubscriptionsModule } from '../presenceSubsciptions/presenceSubscriptions.module';

@Module({
  imports: [SessionsModule, PresenceModule, PresenceSubscriptionsModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
