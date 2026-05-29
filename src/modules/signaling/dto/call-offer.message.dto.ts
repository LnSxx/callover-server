import { IsIn, IsMongoId, IsString } from 'class-validator';
import type { CallType } from '../../../entities/call';

export class CallOfferMessageDto {
  @IsMongoId()
  toUserId!: string;

  @IsString()
  sdp!: string;

  @IsIn(['audio', 'video'])
  type!: CallType;
}
