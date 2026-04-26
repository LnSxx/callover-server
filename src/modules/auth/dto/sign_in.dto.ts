import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SignInDto {
  @ApiProperty({
    description: 'Username in system',
    example: 'calloveruser',
  })
  @IsString()
  @MinLength(1, {
    message: 'Username is required',
    context: {
      code: 'USERNAME_IS_REQUIRED',
    },
  })
  // Ignore excessively long input strings
  @MaxLength(100)
  username!: string;

  @ApiProperty({
    example: 'u3ersPAs$w0Rd',
  })
  @IsString()
  @MinLength(1, {
    message: 'Password is required',
    context: {
      code: 'PASSWORD_IS_REQUIRED',
    },
  })
  // Ignore excessively long input strings
  @MaxLength(512)
  password!: string;
}
