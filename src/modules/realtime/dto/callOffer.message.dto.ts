import { IsIn, IsString } from 'class-validator';
import { CallOfferOutgoingEventPayload } from '../realtime.events';
import type { CallType } from '../../calls/calls.types';

export class CallOfferOutgoingMessageDto implements CallOfferOutgoingEventPayload {
  @IsString()
  toUserId!: string;

  @IsString()
  sdp!: string;

  @IsIn(['audio', 'video'])
  type!: CallType;
}
