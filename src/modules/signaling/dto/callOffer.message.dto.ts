import {
  IsIn,
  IsMongoId,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CallType } from '../../calls/calls.types';

export class CallOfferMessageDto {
  @IsMongoId()
  toUserId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(50_000)
  sdp!: string;

  @IsIn(['audio', 'video'])
  type!: CallType;
}
