import { ApiProperty } from '@nestjs/swagger';
import { IsValidPassword } from '../../../common/validators/is_valid_password';
import { IsValidUsername } from '../../../common/validators/is_valid_username';

export class RegisterDto {
  @ApiProperty({ example: 'calloveruser' })
  @IsValidUsername()
  username!: string;

  @ApiProperty({ example: 'u3ersPAs$w0Rd' })
  @IsValidPassword()
  password!: string;
}
