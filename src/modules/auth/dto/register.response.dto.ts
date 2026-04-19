import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from 'src/common/domain/user.dto';

export class RegisterResponseDto {
  @ApiProperty()
  user!: UserDto;
}
