import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { SessionsModule } from '../sessions/sessions.module';
import { PresenceModule } from '../presence/presence.module';
import { PresenceSubscriptionsModule } from '../presenceSubsciptions/presenceSubscriptions.module';
import { CallsModule } from '../calls/calls.module';
import { APP_GUARD } from '@nestjs/core';
import { RealtimeAuthGuard } from './realtime.guard';

@Module({
  imports: [
    SessionsModule,
    PresenceModule,
    PresenceSubscriptionsModule,
    CallsModule,
  ],
  providers: [
    RealtimeGateway,
    {
      provide: APP_GUARD,
      useClass: RealtimeAuthGuard,
    },
  ],
})
export class RealtimeModule {}
