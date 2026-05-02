import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PresenceModule } from './modules/presence/presence.module';
import { PresenceSubscriptionsModule } from './modules/presenceSubsciptions/presenceSubscriptions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { CallsModule } from './modules/calls/calls.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AccountsModule } from './modules/account/account.module';
import { ProfileModule } from './modules/profile/profile.module';
import { SignalingModule } from './modules/signaling/signaling.module';

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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
