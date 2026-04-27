import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  getValidationErrorCodeDefaultMessage,
  ValidationErrorCode,
} from '../errors/validation_error_code';

export function IsValidUsername() {
  return applyDecorators(
    IsString(),
    MinLength(4, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_TOO_SHORT,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_TOO_SHORT,
      },
    }),
    MaxLength(25, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_TOO_LONG,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_TOO_LONG,
      },
    }),
    Matches(/^[a-zA-Z0-9._]+$/, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_INVALID_SYMBOLS,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_INVALID_SYMBOLS,
      },
    }),
    Matches(/^(?!\d+$).+$/, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_ONLY_NUMBERS,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_ONLY_NUMBERS,
      },
    }),
    Matches(/^[^0-9]/, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_STARTS_WITH_NUMBER,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_STARTS_WITH_NUMBER,
      },
    }),
    Matches(/[a-zA-Z0-9]$/, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_END_INVALID,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_END_INVALID,
      },
    }),
    Matches(/^(?!.*[._]{2})/, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.USERNAME_CONSECUTIVE_DOTS_UNDERSCORES,
      ),
      context: {
        code: ValidationErrorCode.USERNAME_CONSECUTIVE_DOTS_UNDERSCORES,
      },
    }),
  );
}
