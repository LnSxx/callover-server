import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PresenceModule } from './modules/presence/presence.module';
import { PresenceSubscriptionsModule } from './modules/presence-subsciptions/presence-subscriptions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { CallsModule } from './modules/calls/calls.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AccountsModule } from './modules/account/account.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SignalingModule } from './modules/signaling/signaling.module';
import { RedisModule } from './modules/redis/redis.module';
import { CallPermissionsModule } from './modules/call-permissions/call-permissions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CallLogsModule } from './modules/call-logs/call-logs.module';
import { CallCoordinatorModule } from './modules/call-coordinator/call-coordinator.module';
import { CallLifecycleModule } from './modules/call-lifecycle/call-lifecycle.module';
import { BullModule } from '@nestjs/bullmq';
import { REDIS_URL } from './modules/redis/redis.provider';
import { CallTimeoutsModule } from './modules/call-timeouts/call-timeouts.module';
import { CallTimeoutsProcessorModule } from './modules/call-timeouts-processor/call-timeouts-processor.module';
import { CallTimeoutsNotifierModule } from './modules/call-timeouts-notifier/call-timeouts-notifier.module';
import { PushTokensModule } from './modules/push-tokens/push-tokens.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 1000,
        },
      ],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    AuthModule,
    AccountsModule,
    ProfileModule,
    UsersModule,
    ContactsModule,
    RealtimeModule,
    SignalingModule,
    PresenceModule,
    PresenceSubscriptionsModule,
    SessionsModule,
    CallsModule,
    RedisModule,
    CallPermissionsModule,
    NotificationsModule,
    CallLogsModule,
    CallCoordinatorModule,
    CallLifecycleModule,
    BullModule.forRoot({
      connection: {
        host: REDIS_URL.hostname,
        port: Number(REDIS_URL.port),
      },
    }),
    CallTimeoutsModule,
    CallTimeoutsProcessorModule,
    CallTimeoutsNotifierModule,
    PushTokensModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
