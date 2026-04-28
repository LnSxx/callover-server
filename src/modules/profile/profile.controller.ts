import {
  Controller,
  Get,
  Body,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current_user.decorator';
import { UsersService } from '../users/users.service';
import { GetMeResponseDto } from './dto/get_me.response.dto';
import { UpdateProfileDto } from './dto/update_profile.dto';
import { UpdateProfileResponseDto } from './dto/update_profile.response.dto';

@Controller('profile')
export class ProfileController {
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
}
