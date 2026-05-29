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
import { CallAdministratorModule } from './modules/call-administrator/call-administrator.module';
import { CallLifecycleModule } from './modules/call-lifecycle/call-lifecycle.module';

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
    CallAdministratorModule,
    CallLifecycleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
