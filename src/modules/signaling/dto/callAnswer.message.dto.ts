/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CallAnswerMessageDto {
  @IsMongoId()
  toUserId!: string;

  @Transform(({ value }) => {
    if (value === null || value === undefined) return value;
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(50_000)
  sdp?: string | null;
}
