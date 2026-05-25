import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  getValidationErrorCodeDefaultMessage,
  ValidationErrorCode,
} from '../../../common/errors/validation-error-code';

export class SignInDto {
  @ApiProperty({
    description: 'Username in system',
    example: 'calloveruser',
  })
  @IsString()
  @MinLength(1, {
    message: getValidationErrorCodeDefaultMessage(
      ValidationErrorCode.USERNAME_IS_REQUIRED,
    ),
    context: {
      code: ValidationErrorCode.USERNAME_IS_REQUIRED,
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
    message: getValidationErrorCodeDefaultMessage(
      ValidationErrorCode.PASSWORD_IS_REQUIRED,
    ),
    context: {
      code: ValidationErrorCode.PASSWORD_IS_REQUIRED,
    },
  })
  // Ignore excessively long input strings
  @MaxLength(512)
  password!: string;
}
