import { IsString } from 'class-validator';
import { CallIceCandidateEventPayload } from '../realtime.events';

export class CallIceCandidateMessageDto implements CallIceCandidateEventPayload {
  @IsString()
  toUserId: string;

  @IsString()
  candidate: string;
}
