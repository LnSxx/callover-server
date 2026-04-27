export enum ValidationErrorCode {
  // Username validation errors
  // Used for register & update user profile
  USERNAME_IS_REQUIRED = 'USERNAME_IS_REQUIRED',
  USERNAME_TOO_SHORT = 'USERNAME_TOO_SHORT',
  USERNAME_TOO_LONG = 'USERNAME_TOO_LONG',
  USERNAME_INVALID_SYMBOLS = 'USERNAME_INVALID_SYMBOLS',
  USERNAME_ONLY_NUMBERS = 'USERNAME_ONLY_NUMBERS',
  USERNAME_STARTS_WITH_NUMBER = 'USERNAME_STARTS_WITH_NUMBER',
  USERNAME_END_INVALID = 'USERNAME_END_INVALID',
  USERNAME_CONSECUTIVE_DOTS_UNDERSCORES = 'USERNAME_CONSECUTIVE_DOTS_UNDERSCORES',

  // Password validation errors
  // Used for register & update user profile
  PASSWORD_IS_REQUIRED = 'PASSWORD_IS_REQUIRED',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_BIG = 'PASSWORD_TOO_BIG',
  PASSWORD_EDGE_WHITESPACE = 'PASSWORD_EDGE_WHITESPACE',
  PASSWORD_HAS_CONTROLS = 'PASSWORD_HAS_CONTROLS',
}

export function getValidationErrorCodeDefaultMessage(
  code: ValidationErrorCode,
): string {
  switch (code) {
    case ValidationErrorCode.USERNAME_IS_REQUIRED:
      return 'Username is required';
    case ValidationErrorCode.USERNAME_TOO_SHORT:
      return 'Username should be at least 4 characters long';
    case ValidationErrorCode.USERNAME_TOO_LONG:
      return 'Username should not be longer than 25 characters';
    case ValidationErrorCode.USERNAME_INVALID_SYMBOLS:
      return 'Username can contain letters, numbers, dots and underscores';
    case ValidationErrorCode.USERNAME_ONLY_NUMBERS:
      return 'Username cannot contain only numbers';
    case ValidationErrorCode.USERNAME_STARTS_WITH_NUMBER:
      return 'Username cannot start with a number';
    case ValidationErrorCode.USERNAME_END_INVALID:
      return 'Username must end with a letter or number';

    case ValidationErrorCode.PASSWORD_IS_REQUIRED:
      return 'Password is required';
    case ValidationErrorCode.PASSWORD_TOO_SHORT:
      return 'Password should be at least 12 characters long';
    case ValidationErrorCode.PASSWORD_TOO_BIG:
      return 'Password should not be longer than 72 bytes';
    case ValidationErrorCode.PASSWORD_EDGE_WHITESPACE:
      return 'Password should not start or end with whitespace';
    case ValidationErrorCode.PASSWORD_HAS_CONTROLS:
      return 'Password must not contain control characters';
    default:
      return code.toString();
  }
}
