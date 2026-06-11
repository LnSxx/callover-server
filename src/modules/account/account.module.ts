import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AccountsService } from './account.service';
import { AccountController } from './account.controller';
import { CallLogsModule } from '../call-logs/call-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactsModule } from '../contacts/contacts.module';
import { PushTokensModule } from '../push-tokens/push-tokens.module';

@Module({
  imports: [
    SessionsModule,
    UsersModule,
    CallLogsModule,
    NotificationsModule,
    ContactsModule,
    PushTokensModule,
  ],
  controllers: [AccountController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
