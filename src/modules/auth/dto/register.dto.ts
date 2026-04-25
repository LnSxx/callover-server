import { ApiProperty } from '@nestjs/swagger';
import {
  Contains,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  NotContains,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'calloveruser' })
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
      code: 'USERNAME_INVALID',
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
  @Contains(' ', {
    message: 'Username cannot contain spaces',
    context: {
      code: 'USERNAME_INVALID',
    },
  })
  username!: string;

  @ApiProperty({ example: 'u3ersPAs$w0Rd' })
  @IsString()
  @NotContains(' ', {
    message: 'Password should not contain spaces',
    context: {
      code: 'INVALID',
    },
  })
  @MinLength(8)
  password!: string;
}
