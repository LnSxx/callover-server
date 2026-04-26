import { ApiProperty } from '@nestjs/swagger';
import {
  IsByteLength,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'calloveruser' })
  @IsString()
  @MinLength(4, {
    message: 'Username should be at least 4 characters long',
    context: {
      code: 'USERNAME_TOO_SHORT',
    },
  })
  @MaxLength(25, {
    message: 'Username should not be longer than 25 characters',
    context: {
      code: 'USERNAME_TOO_LONG',
    },
  })
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Username can contain letters, numbers, dots and underscores',
    context: {
      code: 'USERNAME_INVALID_',
    },
  })
  @Matches(/^(?!\d+$).+$/, {
    message: 'Username cannot contain only numbers',
    context: {
      code: 'USERNAME_INVALID',
    },
  })
  @Matches(/^[^0-9]/, {
    message: 'Username cannot start with a number',
    context: {
      code: 'USERNAME_INVALID',
    },
  })
  @Matches(/[a-zA-Z0-9]$/, {
    message: 'Username must end with a letter or number',
    context: {
      code: 'USERNAME_INVALID',
    },
  })
  @Matches(/^(?!.*[._]{2})/, {
    message: 'Username cannot contain consecutive dots or underscores',
    context: {
      code: 'USERNAME_INVALID',
    },
  })
  username!: string;

  @ApiProperty({ example: 'u3ersPAs$w0Rd' })
  @MinLength(8, {
    message: 'Password should be at least 8 characters long',
    context: { code: 'PASSWORD_TOO_SHORT' },
  })
  // bcrypt limitation
  @IsByteLength(0, 72, {
    message: 'Password should not be longer than 72 bytes',
    context: { code: 'PASSWORD_TOO_LONG_BYTES' },
  })
  @Matches(/^\S(?:.*\S)?$/, {
    message: 'Password must not start or end with whitespace',
    context: { code: 'PASSWORD_EDGE_WHITESPACE' },
  })
  @Matches(/^[^\p{C}]+$/u, {
    message: 'Password must not contain control characters',
    context: { code: 'PASSWORD_CONTROL_CHARS' },
  })
  password!: string;
}
