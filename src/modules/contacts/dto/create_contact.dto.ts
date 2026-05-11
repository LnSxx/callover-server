import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  getValidationErrorCodeDefaultMessage,
  ValidationErrorCode,
} from '../../../common/errors/validation_error_code';

export class CreateContactDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId({
    message: getValidationErrorCodeDefaultMessage(
      ValidationErrorCode.CONTACT_UID_INVALID,
    ),
    context: {
      code: ValidationErrorCode.CONTACT_UID_INVALID,
    },
  })
  contactUserId!: string;

  @ApiPropertyOptional({ example: 'Ivan Ivanov' })
  @IsOptional()
  @IsString()
  @MaxLength(80, {
    message: getValidationErrorCodeDefaultMessage(
      ValidationErrorCode.CONTACT_NAME_TOO_BIG,
    ),
    context: {
      code: ValidationErrorCode.CONTACT_NAME_TOO_BIG,
    },
  })
  alias?: string;

  @ApiPropertyOptional({ example: 'Best friend' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isFavourite?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}
