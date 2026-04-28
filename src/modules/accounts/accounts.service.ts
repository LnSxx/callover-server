import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly usersService: UsersService,
  ) {}

  async deleteAccount(userId: string): Promise<{
    isDeleted: boolean;
  }> {
    await this.sessionsService.deleteAllSessionsForUserId(userId);
    return await this.usersService.delete(userId);
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
