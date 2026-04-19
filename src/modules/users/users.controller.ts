import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update_user.dto';
import { GetMeResponseDto } from './dto/get_me.response.dto';
import { UpdateMeResponseDto } from './dto/update_me.response.dto';
import { CurrentUser } from '../../common/decorators/current_user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async get(@CurrentUser() user: { id: string }): Promise<GetMeResponseDto> {
    const res = await this.usersService.findById(user.id);
    if (res) {
      return {
        id: String(res._id),
        username: res.username,
        email: res.email,
      };
    }
    throw new NotFoundException();
  }

  @Patch('me')
  async update(
    @CurrentUser() user: { id: string },
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UpdateMeResponseDto> {
    const updated = await this.usersService.update(user.id, updateUserDto);
    if (updated) {
      return {
        id: String(updated._id),
        username: updated.username,
        email: updated.email,
      };
    }
    throw new InternalServerErrorException();
  }

  @Delete('me')
  remove(@CurrentUser() user: { id: string }) {
    return this.usersService.remove(user.id);
  }
}
