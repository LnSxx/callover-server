import { IsIn, IsString } from 'class-validator';
import type { CallOfferEventPayload } from '../realtime.events';
import type { CallType } from '../../calls/calls.types';

export class CallOfferMessageDto implements CallOfferEventPayload {
  @IsString()
  toUserId!: string;

  @IsString()
  sdp!: string;

  @IsIn(['audio', 'video'])
  type!: CallType;
}
