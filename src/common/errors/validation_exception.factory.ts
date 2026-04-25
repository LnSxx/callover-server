import { BadRequestException, ValidationError } from '@nestjs/common';

type FieldValidationError = {
  field: string;
  code: string;
  message: string;
};

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    errors: mapValidationErrors(errors),
  });
}

function mapValidationErrors(
  errors: ValidationError[],
): FieldValidationError[] {
  return errors.flatMap((error) => {
    const fieldErrors = Object.entries(error.constraints ?? {}).map(
      ([constraintName, message]) => ({
        field: error.property,
        code: getValidationCode(error, constraintName),
        message,
      }),
    );

    const childrenErrors = error.children?.length
      ? mapValidationErrors(error.children)
      : [];

    return [...fieldErrors, ...childrenErrors];
  });
}

function getValidationCode(
  error: ValidationError,
  constraintName: string,
): string {
  try {
    const context = error.contexts?.[constraintName] as { code: string };
    return context.code;
  } catch {
    return 'VALIDATION_ERROR';
  }
}
