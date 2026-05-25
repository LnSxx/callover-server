import { ApiProperty } from '@nestjs/swagger';
import { IsValidPassword } from '../../../common/validators/is-valid-password';
import { IsValidUsername } from '../../../common/validators/is-valid-username';

export class RegisterDto {
  @ApiProperty({ example: 'calloveruser' })
  @IsValidUsername()
  username!: string;

  @ApiProperty({ example: 'u3ersPAs$w0Rd' })
  @IsValidPassword()
  password!: string;
}
