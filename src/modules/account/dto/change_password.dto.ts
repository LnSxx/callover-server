import { ApiProperty } from '@nestjs/swagger';
import { IsValidPassword } from '../../../common/validators/is_valid_password';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  getValidationErrorCodeDefaultMessage,
  ValidationErrorCode,
} from '../../../common/errors/validation_error_code';

export class ChangePasswordDto {
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

  @ApiProperty({
    example: 'NEW u3ersPAs$w0Rd',
  })
  @IsValidPassword()
  newPassword!: string;
}
