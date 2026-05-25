import { applyDecorators } from '@nestjs/common';
import { IsByteLength, IsString, Matches, MinLength } from 'class-validator';
import {
  getValidationErrorCodeDefaultMessage,
  ValidationErrorCode,
} from '../errors/validation-error-code';

export function IsValidPassword() {
  return applyDecorators(
    IsString(),
    MinLength(12, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.PASSWORD_TOO_SHORT,
      ),
      context: {
        code: ValidationErrorCode.PASSWORD_TOO_SHORT,
      },
    }),
    // bcrypt limitation
    IsByteLength(0, 72, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.PASSWORD_TOO_BIG,
      ),
      context: {
        code: ValidationErrorCode.PASSWORD_TOO_BIG,
      },
    }),
    Matches(/^\S(?:.*\S)?$/, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.PASSWORD_EDGE_WHITESPACE,
      ),
      context: {
        code: ValidationErrorCode.PASSWORD_EDGE_WHITESPACE,
      },
    }),
    Matches(/^[^\p{C}]+$/u, {
      message: getValidationErrorCodeDefaultMessage(
        ValidationErrorCode.PASSWORD_HAS_CONTROLS,
      ),
      context: {
        code: ValidationErrorCode.PASSWORD_HAS_CONTROLS,
      },
    }),
  );
}
