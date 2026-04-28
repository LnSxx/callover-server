import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AccountsService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [SessionsModule, UsersModule],
  controllers: [AccountController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
