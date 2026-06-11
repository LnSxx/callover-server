import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { CallLogsService } from '../call-logs/call-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContactsService } from '../contacts/contacts.service';
import { PushTokensService } from '../push-tokens/push-tokens.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
    private readonly callLogsService: CallLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly contactsService: ContactsService,
    private readonly pushTokensService: PushTokensService,
  ) {}

  async deleteAccount(userId: string): Promise<{
    isDeleted: boolean;
  }> {
    await Promise.all([
      this.sessionsService.deleteAllSessionsForUserId(userId),
      this.callLogsService.deleteAllCallLogsForUserId(userId),
      this.notificationsService.deleteAllNotificationsForUserId(userId),
      this.contactsService.deleteAllContactsForUserId(userId),
      this.pushTokensService.deleteAllTokensForUserId(userId),
    ]);
    return this.usersService.delete(userId);
  }

  async changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    isChanged: boolean;
  }> {
    const result = await this.usersService.changePassword(params.userId, {
      currentPassword: params.currentPassword,
      newPassword: params.newPassword,
    });

    if (!result.isChanged) {
      throw new InternalServerErrorException('Failed to change password');
    }

    await this.sessionsService.revokeAllSessionsForUserId(params.userId);

    return result;
  }
}
