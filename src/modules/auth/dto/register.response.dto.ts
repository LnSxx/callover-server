import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../../common/domain/user.dto';
export class RegisterResponseDto {
  @ApiProperty()
  user!: UserDto;
}
