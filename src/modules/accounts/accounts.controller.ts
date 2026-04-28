import {
  Controller,
  Body,
  Patch,
  Delete,
  NotFoundException,
  HttpCode,
  Res,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current_user.decorator';
import { AccountsService } from '../accounts/accounts.service';
import type { Response } from 'express';
import { ChangePasswordDto } from './dto/change_password.dto';

@Controller('account')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Patch('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() changePasswordDto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.accountsService.changePassword({
      userId: user.id,
      currentPassword: changePasswordDto.password,
      newPassword: changePasswordDto.newPassword,
    });

    if (!result.isChanged) {
      throw new NotFoundException();
    }

    this.clearSessionCookie(res);
  }

  @Delete()
  @HttpCode(204)
  async delete(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.accountsService.deleteAccount(user.id);

    if (!result.isDeleted) {
      throw new NotFoundException();
    }

    this.clearSessionCookie(res);
  }

  private clearSessionCookie(res: Response): void {
    res.cookie('sessionId', '', {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
    });
  }
}
