import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update_profile.dto';
import { GetMeResponseDto } from './dto/get_me.response.dto';
import { CurrentUser } from '../../common/decorators/current_user.decorator';
import { UpdateProfileResponseDto } from './dto/update_profile.response.dto';
import { ChangePasswordDto } from './dto/change_password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async get(@CurrentUser() user: { id: string }): Promise<GetMeResponseDto> {
    const result = await this.usersService.findById(user.id);
    if (!result) {
      throw new NotFoundException();
    }

    return {
      id: String(result._id),
      username: result.username,
      email: result.email,
    };
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() updateUserDto: UpdateProfileDto,
  ): Promise<UpdateProfileResponseDto> {
    console.log('call controler user', updateUserDto);
    const updatedUser = await this.usersService.updateProfile(user.id, {
      username: updateUserDto.username,
      email: updateUserDto.email,
    });
    if (!updatedUser) {
      throw new NotFoundException();
    }
    return {
      id: String(updatedUser._id),
      username: updatedUser.username,
      email: updatedUser.email,
    };
  }

  @Patch('me/password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const result = await this.usersService.changePassword(user.id, {
      currentPassword: changePasswordDto.password,
      newPassword: changePasswordDto.newPassword,
    });

    if (!result.isChanged) {
      throw new NotFoundException();
    }
  }

  @Delete('me')
  @HttpCode(204)
  async remove(@CurrentUser() user: { id: string }): Promise<void> {
    await this.usersService.remove(user.id);
  }
}
