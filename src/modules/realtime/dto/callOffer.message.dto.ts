import { IsString } from 'class-validator';
import { CallOfferEventPayload } from '../realtime.events';

export class CallOfferMessageDto implements CallOfferEventPayload {
  @IsString()
  toUserId: string;

  @IsString()
  sdp: string;
}
