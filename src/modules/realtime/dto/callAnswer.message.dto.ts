import { IsString } from 'class-validator';
import { CallAnswerOutgoingEventPayload } from '../realtime.events';

export class CallAnswerOutgoingMessageDto implements CallAnswerOutgoingEventPayload {
  @IsString()
  toUserId: string;

  sdp?: string | null;
}
