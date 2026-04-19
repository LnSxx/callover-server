import { ApiProperty } from '@nestjs/swagger';
import {
  IsAlphanumeric,
  IsString,
  MinLength,
  NotContains,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'calloveruser' })
  @IsAlphanumeric()
  @MinLength(4)
  username!: string;

  @ApiProperty({ example: 'u3ersPAs$w0Rd' })
  @IsString()
  @NotContains(' ', { message: 'password should not contain spaces' })
  @MinLength(8)
  password!: string;
}
